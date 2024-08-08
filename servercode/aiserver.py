import asyncio
import cv2
import numpy as np
import socketio
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.contrib.signaling import BYE
import json
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.layers import Layer
from tensorflow.keras.losses import Loss

# Define and register the AttentionLayer class
@tf.keras.utils.register_keras_serializable()
class AttentionLayer(Layer):
    def __init__(self, **kwargs):
        super(AttentionLayer, self).__init__(**kwargs)

    def build(self, input_shape):
        self.W = self.add_weight(shape=(input_shape[-1], input_shape[-1]),
                                 initializer='glorot_uniform',
                                 trainable=True)
        self.b = self.add_weight(shape=(input_shape[-1],),
                                 initializer='zeros',
                                 trainable=True)
        self.u = self.add_weight(shape=(input_shape[-1],),
                                 initializer='glorot_uniform',
                                 trainable=True)
        super(AttentionLayer, self).build(input_shape)

    def call(self, x):
        uit = tf.tanh(tf.tensordot(x, self.W, axes=1) + self.b)
        ait = tf.tensordot(uit, self.u, axes=1)
        ait = tf.exp(ait)
        ait_sum = tf.reduce_sum(ait, axis=1, keepdims=True)
        ait = ait / ait_sum
        return tf.reduce_sum(x * tf.expand_dims(ait, -1), axis=1)

    def get_config(self):
        config = super(AttentionLayer, self).get_config()
        return config

# Define the HuberLoss class
@tf.keras.utils.register_keras_serializable()
class HuberLoss(Loss):
    def __init__(self, delta=1.0, **kwargs):
        super().__init__(**kwargs)
        self.delta = delta

    def call(self, y_true, y_pred):
        error = y_true - y_pred
        abs_error = tf.abs(error)
        quadratic = tf.minimum(abs_error, self.delta)
        linear = abs_error - quadratic
        loss = 0.5 * tf.square(quadratic) + self.delta * linear
        return tf.reduce_mean(loss)

    def get_config(self):
        config = super().get_config()
        config.update({"delta": self.delta})
        return config

# Define the GAP metric
def global_average_precision(y_true, y_pred):
    top_N_indices = tf.argsort(y_pred, direction='DESCENDING')
    y_true_sorted = tf.gather(y_true, top_N_indices, batch_dims=1)
    y_pred_sorted = tf.gather(y_pred, top_N_indices, batch_dims=1)

    precisions = tf.cumsum(y_true_sorted, axis=1) / tf.cast(tf.range(1, tf.shape(y_true_sorted)[1] + 1), tf.float32)
    recalls = tf.cumsum(y_true_sorted, axis=1) / tf.reduce_sum(y_true_sorted, axis=1, keepdims=True)

    precisions = tf.reduce_sum(precisions * y_true_sorted, axis=1)
    recalls = tf.reduce_sum(recalls * y_true_sorted, axis=1)

    gap = tf.reduce_mean(precisions * recalls)
    return gap

# Load the Keras model with custom objects
try:
    loaded_model = tf.keras.models.load_model('model_new.keras', custom_objects={
        'AttentionLayer': AttentionLayer,
        'HuberLoss': HuberLoss,
        'global_average_precision': global_average_precision
    })
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading the model: {e}")
    loaded_model = None

class VideoTransformTrack(VideoStreamTrack):
    def __init__(self, track, model):
        super().__init__()  # Don't forget this!
        self.track = track
        self.model = model

    async def recv(self):
        frame = await self.track.recv()
        img = frame.to_ndarray(format="bgr24")

        # Preprocess the image as required by your model
        img_resized = cv2.resize(img, (224, 224))  # Example resize, adjust based on your model input
        img_normalized = img_resized / 255.0
        img_expanded = np.expand_dims(img_normalized, axis=0)

        # Perform inference
        try:
            prediction = self.model.predict(img_expanded)
        except Exception as e:
            print(f"Error during model prediction: {e}")
            return frame

        # Post-process the output as needed
        # Example: converting prediction to a processed frame
        processed_frame = (prediction[0] * 255).astype(np.uint8)

        # Recreate a VideoFrame and return it
        new_frame = frame.from_ndarray(processed_frame, format="bgr24")
        new_frame.pts = frame.pts
        new_frame.time_base = frame.time_base
        return new_frame

async def run(pc, sio, model, user_id, target_user_id):
    @pc.on("datachannel")
    def on_datachannel(channel):
        @channel.on("message")
        async def on_message(message):
            # Handle received message
            pass

    @pc.on("track")
    def on_track(track):
        if track.kind == "video":
            local_video = VideoTransformTrack(track, model)
            pc.addTrack(local_video)

    @sio.event
    async def connect():
        print("Connected to server")
        await sio.emit('register', user_id)

    @sio.event
    async def disconnect():
        print("Disconnected from server")

    @sio.on("connection-success")
    async def on_connection_success(success):
        print(success)

    @sio.on("offerOrAnswer")
    async def on_offer_or_answer(data):
        if data['from'] == target_user_id:
            # Perform actions similar to navigating to calling screen
            print("Received offer/answer from target user")
        sdp = data
        await pc.setRemoteDescription(RTCSessionDescription(sdp=sdp["sdp"], type=sdp["type"]))

    @sio.on("candidate")
    async def on_candidate(data):
        candidate = data
        await pc.addIceCandidate(candidate)

async def main():
    sio = socketio.AsyncClient()
    uri = 'https://6402-2a0d-6fc2-49a3-2000-c9b9-78cc-590-c617.ngrok-free.app/webrtcPeer'
    path = '/io/webrtc'
    user_id = '123'  # Replace with actual user ID
    target_user_id = ''  # Replace with actual target user ID

    pc = RTCPeerConnection()
    await sio.connect(uri, transports=['websocket'], socketio_path=path)
    await run(pc, sio, loaded_model, user_id, target_user_id)
    await sio.wait()

if __name__ == "__main__":
    asyncio.run(main())
