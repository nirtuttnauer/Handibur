import asyncio
import cv2
import numpy as np
import socketio
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack, RTCIceCandidate, RTCConfiguration, RTCIceServer
import json
import tensorflow as tf
import mediapipe as mp
import random
import string

# Generate a unique server ID
def generate_unique_server_id(length=12):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

server_id = generate_unique_server_id()

try:
    label_array = np.load('combined_label_encoder.npy', allow_pickle=True)
    print(f"Label array loaded successfully. Shape: {label_array.shape}")
except Exception as e:
    print(f"Error loading label array: {e}")
    label_array = None

# Define and register the AttentionLayer class
@tf.keras.utils.register_keras_serializable()
class AttentionLayer(tf.keras.layers.Layer):
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
class HuberLoss(tf.keras.losses.Loss):
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

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands.Hands(min_detection_confidence=0.6, min_tracking_confidence=0.5, max_num_hands=2)

def extract_hand_landmarks(frame):
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = mp_hands.process(frame_rgb)
    landmarks = []
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            frame_landmarks = []
            for landmark in hand_landmarks.landmark[:21]:  # Only take the first 21 landmarks
                frame_landmarks.append([landmark.x, landmark.y, landmark.z])
            landmarks.append(frame_landmarks)
    print(f"Extracted {len(landmarks)} sets of landmarks")
    return landmarks

def pad_landmarks(landmarks, target_length=21):  # Ensure target_length is 21
    current_length = len(landmarks)
    if current_length < target_length:
        if current_length == 0:
            print("Warning: No landmarks detected, padding with zeros")
            padding = [np.zeros((21, 3)) for _ in range(target_length)]
        else:
            padding = [landmarks[-1] for _ in range(target_length - current_length)]
        landmarks.extend(padding)
    print(f"Padded landmarks length: {len(landmarks)}")
    return landmarks[:target_length]

class VideoTransformTrack(VideoStreamTrack):
    def __init__(self, track, model, sio, data_channel, target_fps=30):
        super().__init__()
        self.track = track
        self.model = model
        self.sio = sio
        self.data_channel = data_channel
        self.current_sentence = ""
        self.frame_buffer = []  # Buffer to hold the last 40 frames
        self.buffer_size = 40  # Number of frames to collect before making a prediction
        self.target_fps = target_fps  # Target frames per second
        self.frame_interval = 1 / target_fps  # Interval between frames
        self.last_frame_time = None

    async def recv(self):
        if self.last_frame_time is None:
            self.last_frame_time = asyncio.get_event_loop().time()

        current_time = asyncio.get_event_loop().time()
        time_elapsed = current_time - self.last_frame_time

        if time_elapsed < self.frame_interval:
            await asyncio.sleep(self.frame_interval - time_elapsed)

        self.last_frame_time = asyncio.get_event_loop().time()

        frame = await self.track.recv()

        # Convert to BGR (more common for OpenCV)
        img = frame.to_ndarray(format="bgr24")

        # Preprocess the image to extract landmarks
        landmarks = extract_hand_landmarks(img)
        if not landmarks:
            return frame

        padded_landmarks = pad_landmarks(landmarks[0], target_length=21)
        self.frame_buffer.append(padded_landmarks)

        if len(self.frame_buffer) == self.buffer_size:
            img_expanded = np.expand_dims(self.frame_buffer, axis=0)  # Shape: (1, 40, 21, 3)
            try:
                # Predict the gesture using the model
                prediction = self.model.predict(img_expanded)
                predicted_index = np.argmax(prediction)
                predicted_label = label_array[predicted_index]
                print(f"Predicted Label: {predicted_label}")

                # Optionally, append the predicted label to a sentence for continuous recognition
                self.current_sentence += " " + predicted_label
                print(f"Updated sentence: {self.current_sentence.strip()}")

                if self.data_channel:
                    print(f"DataChannel state: {self.data_channel.readyState}")
                    if self.data_channel.readyState == "open":
                        # Use a delimiter to join word and sentence
                        sentence_string = f"{predicted_label}|{self.current_sentence.strip()}"
                        self.data_channel.send(predicted_label)
                        print(f"Sent data: {sentence_string}")
                    else:
                        print("DataChannel is not open. Unable to send data.")
                else:
                    print("DataChannel is None. Unable to send data.")

            except Exception as e:
                print(f"Error during model prediction: {e}")

            # Clear the buffer after making a prediction
            self.frame_buffer = []

        new_frame = frame.from_ndarray(img, format="bgr24")
        new_frame.pts = frame.pts
        new_frame.time_base = frame.time_base
        return new_frame
    
async def run(pc, sio):
    @sio.event
    async def connect():
        print("Connected to signaling server")
        await sio.emit('register', {'role': 'server', 'serverID': server_id})

    @sio.on('connection-success', namespace='/webrtcPeer')
    async def on_connection_success(data):
        print(f"Connection success: {data}")
        
    @sio.on('offerOrAnswer', namespace='/webrtcPeer')
    async def on_offer_or_answer(data):
        print(f"Received {data['type']} from {data.get('from')} with SDP:\n{data['sdp']}")
        try:
            sdp = data['sdp']
            await pc.setRemoteDescription(RTCSessionDescription(sdp, data['type']))
            if data['type'] == 'offer':
                print("Creating answer...")
                answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                print("Answer created, sending back to signaling server...")

                # Include 'targetUserID' in the emitted response
                response_payload = {
                    'sdp': pc.localDescription.sdp,
                    'type': pc.localDescription.type,
                    'from': "123",
                    'targetUserID': data.get('from')  # Assuming 'from' is the targetUserID
                }
                await sio.emit('offerOrAnswer', response_payload, namespace='/webrtcPeer')
                print(f"Sent answer to {data.get('from')}")
        except Exception as e:
            print(f"Error handling offerOrAnswer: {e}")

    @sio.on('candidate', namespace='/webrtcPeer')
    async def on_candidate(data):
        print(f"Received ICE candidate from {data.get('from')}: {data['candidate']}")
        try:
            # Prepare candidate for adding
            candidate_dict = {
                "candidate": data['candidate'],
                "sdpMid": data.get('sdpMid', "0"),  # Assuming '0' if sdpMid is not provided
                "sdpMLineIndex": data.get('sdpMLineIndex', 0)  # Assuming 0 if not provided
            }
            candidate = RTCIceCandidate(candidate_dict)
            await pc.addIceCandidate(candidate)
        except Exception as e:
            print(f"Error adding ICE candidate: {e}")
            
    @sio.on('endCall', namespace='/webrtcPeer')
    async def on_end_call(data):
        print("Ending the call")
        await pc.close()
        print("Call ended")
        sio.disconnect()
        
    @sio.event
    async def disconnect():
        print("Disconnected from signaling server")

async def main():
    

# Correct aiortc configuration
    pc = RTCPeerConnection(RTCConfiguration(iceServers=
        [
            RTCIceServer(urls=["stun:stun.l.google.com:19302"]),
            RTCIceServer(urls=["stun:stun1.l.google.com:19302"]),
            RTCIceServer(urls=["stun:stun2.l.google.com:19302"]),
            RTCIceServer(urls=["stun:stun3.l.google.com:19302"]),
            RTCIceServer(urls=["stun:stun4.l.google.com:19302"]),
        ]
    ))

    sio = socketio.AsyncClient()
    datachannel = None

    @pc.on("datachannel")
    def on_datachannel(channel):
        print(f"DataChannel established: {channel.label}")
        nonlocal datachannel
        datachannel = channel

        @datachannel.on("message")
        def on_message(message):
            print(f"Received message: {message}")

        @datachannel.on("open")
        def on_open():
            print("DataChannel is open")
            datachannel.send(json.dumps({"test": "DataChannel is working"}))
            print("Test message sent on DataChannel")

        @datachannel.on("close")
        def on_close():
            print("DataChannel is closed")

    @pc.on("track")
    def on_track(track: VideoStreamTrack):
        print(f"Track received: {track.kind}")
        
        if track.kind == "video":
            # Replace the incoming video track with your VideoTransformTrack
            video_transform_track = VideoTransformTrack(track, loaded_model, sio, data_channel=datachannel)
            pc.addTrack(video_transform_track)
        else:
            # If the track is not video, you can add it directly without transformation
            pc.addTrack(track)

    # Create the DataChannel if this is the offering side
    if not datachannel:
        datachannel = pc.createDataChannel("chat")
        print("DataChannel created")

    await run(pc, sio)

    try:
        await sio.connect(
            'https://4f61fabc665a.ngrok.app',
            transports=['websocket'],
            socketio_path='/io/webrtc',
            wait_timeout=10,
            auth={'role': 'server', 'userID': "123"},
            namespaces=['/webrtcPeer']
        )
    except socketio.exceptions.ConnectionError as e:
        print(f"Failed to connect to signaling server: {e}")
        await sio.disconnect()

    await sio.wait()

if __name__ == "__main__":
    asyncio.run(main())