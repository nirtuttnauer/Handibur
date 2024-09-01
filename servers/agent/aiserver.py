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
import time
from sklearn.preprocessing import LabelEncoder
from scipy.stats import zscore
import warnings
import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
import logging
logging.getLogger('tensorflow').setLevel(logging.ERROR)


# Generate a unique server ID
def generate_unique_server_id(length=12):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

server_id = generate_unique_server_id()

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

def global_average_precision(y_true, y_pred):
    top_N_indices = tf.argsort(y_pred, direction='DESCENDING')
    y_true_sorted = tf.gather(y_true, top_N_indices, batch_dims=1)
    y_pred_sorted = tf.gather(y_pred, top_N_indices, batch_dims=1)

    dtype = y_true_sorted.dtype  # Get the dtype of y_true_sorted to ensure consistency

    precisions = tf.cumsum(y_true_sorted, axis=1) / tf.cast(tf.range(1, tf.shape(y_true_sorted)[1] + 1), dtype)
    recalls = tf.cumsum(y_true_sorted, axis=1) / tf.reduce_sum(y_true_sorted, axis=1, keepdims=True)

    precisions = tf.reduce_sum(precisions * y_true_sorted, axis=1)
    recalls = tf.reduce_sum(recalls * y_true_sorted, axis=1)

    gap = tf.reduce_mean(precisions * recalls)
    return gap

# Load the model
model_path = 'model_aug.keras'
model = tf.keras.models.load_model(model_path, custom_objects={
    'AttentionLayer': AttentionLayer,
    'global_average_precision': global_average_precision
})

# Load the label encoder
label_encoder_path = 'combined_label_encoder_2.npy'
label_encoder = LabelEncoder()
label_encoder.classes_ = np.load(label_encoder_path)

# Suppress warnings from protobuf
warnings.filterwarnings("ignore", category=UserWarning, module='google.protobuf.symbol_database')

# Disable TensorFlow's progress bars
tf.get_logger().setLevel('ERROR')

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands.Hands(min_detection_confidence=0.6, min_tracking_confidence=0.5, max_num_hands=2)

def extract_hand_landmarks(frame):
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)  # Convert BGR to RGB
    results = mp_hands.process(frame_rgb)
    landmarks = []
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            frame_landmarks = []
            for landmark in hand_landmarks.landmark:
                frame_landmarks.append([landmark.x, landmark.y, landmark.z])
            landmarks.append(frame_landmarks)
    return landmarks

def interpolate_landmarks(landmarks, target_length=40):
    current_length = len(landmarks)
    indices = np.linspace(0, current_length - 1, num=target_length).astype(int)
    interpolated_landmarks = [landmarks[i] for i in indices]
    return interpolated_landmarks

def extract_and_average_hands_landmarks(frame):
    landmarks = extract_hand_landmarks(frame)
    if len(landmarks) == 2:
        return np.mean(landmarks, axis=0)
    elif len(landmarks) == 1:
        return landmarks[0]
    else:
        return np.zeros((21, 3))  # Return a zero array if no landmarks are detected

def adaptive_preprocessing(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    v = hsv[:, :, 2]
    mean_brightness = np.mean(v)
    
    if mean_brightness < 100:
        frame = cv2.convertScaleAbs(frame, alpha=1.5, beta=50)
    elif mean_brightness > 180:
        frame = cv2.convertScaleAbs(frame, alpha=0.75, beta=-50)
    
    # Convert back to BGR after preprocessing
    frame_bgr = cv2.cvtColor(frame, cv2.COLOR_HSV2BGR)
    
    return frame_bgr

def sophisticated_outlier_detection(landmarks):
    flattened_landmarks = np.array(landmarks).flatten()
    z_scores = np.abs(zscore(flattened_landmarks))
    return np.any(z_scores > 2.5)

def dynamic_confidence_adjustment(history_buffer, dynamic_threshold):
    if len(history_buffer) > 10:
        history_buffer.pop(0)
    
    avg_score = np.mean([score for _, score in history_buffer])
    return max(0.5, min(0.9, avg_score))

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
        self.history_buffer = []
        self.dynamic_threshold = 0.7
        self.repetition_counter = 0
        self.repetition_threshold = 5  # Allow the same prediction for up to 5 consecutive times
        self.previous_label = None
        self.cooldown_time = 2  # Cooldown time in seconds
        self.last_prediction_time = 0

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

        # Apply adaptive preprocessing
        img = adaptive_preprocessing(img)

        # Preprocess the image to extract and average landmarks
        landmarks = extract_and_average_hands_landmarks(img)
        if np.any(landmarks):  # Check if landmarks are not all zeros
            # Sophisticated Outlier Detection
            if sophisticated_outlier_detection(landmarks):
                return frame  # Skip this frame if it's considered an outlier

            self.frame_buffer.append(landmarks)

            if len(self.frame_buffer) > self.buffer_size:
                self.frame_buffer.pop(0)

            # If enough frames are collected, predict
            if len(self.frame_buffer) == self.buffer_size:
                preprocessed_frames = np.array(self.frame_buffer).reshape(1, self.buffer_size, 21, 3)
                
                # Cooldown mechanism
                current_time = time.time()
                if current_time - self.last_prediction_time >= self.cooldown_time:
                    predictions = np.array([self.model.predict(preprocessed_frames, verbose=0)])
                    avg_prediction = np.mean(predictions, axis=0)

                    top_prediction_label = label_encoder.inverse_transform([np.argmax(avg_prediction[0])])[0]
                    top_prediction_score = np.max(avg_prediction[0])

                    # Dynamic Confidence Threshold
                    if top_prediction_score >= self.dynamic_threshold:
                        if top_prediction_label == self.previous_label:
                            self.repetition_counter += 1
                        else:
                            self.repetition_counter = 0

                        if self.repetition_counter < self.repetition_threshold and top_prediction_label != self.previous_label:
                            self.current_sentence += " " + top_prediction_label
                            print(f"Updated sentence: {self.current_sentence.strip()}")
                            self.last_prediction_time = current_time
                
                        self.previous_label = top_prediction_label
                        self.history_buffer.append((top_prediction_label, top_prediction_score))

                        # Adjust the dynamic threshold
                        self.dynamic_threshold = dynamic_confidence_adjustment(self.history_buffer, self.dynamic_threshold)

                        if self.data_channel and self.data_channel.readyState == "open":
                            sentence_string = f"{top_prediction_label}|{self.current_sentence.strip()}"
                            self.data_channel.send(sentence_string)
                            print(f"Sent data: {sentence_string}")

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
                    'from': server_id,
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
    async def on_end_call():
        print("Ending the call")
        await pc.close()
        print("Call ended")
        await sio.disconnect()
        
    @sio.event
    async def disconnect():
        print("Disconnected from signaling server")

async def main():
    # Load your model and label encoder
    model_path = 'model_aug.keras'
    model = tf.keras.models.load_model(model_path, custom_objects={
        'AttentionLayer': AttentionLayer,
        'global_average_precision': global_average_precision
    })

    label_encoder_path = 'combined_label_encoder_2.npy'
    label_encoder = LabelEncoder()
    label_encoder.classes_ = np.load(label_encoder_path)

    pc = RTCPeerConnection(RTCConfiguration(iceServers=[
        RTCIceServer(urls=["stun:stun.l.google.com:19302"]),
        RTCIceServer(urls=["stun:stun1.l.google.com:19302"]),
        RTCIceServer(urls=["stun:stun2.l.google.com:19302"]),
        RTCIceServer(urls=["stun:stun3.l.google.com:19302"]),
        RTCIceServer(urls=["stun:stun4.l.google.com:19302"]),
    ]))

    sio = socketio.AsyncClient()
    datachannel = None

    @pc.on("datachannel")
    def on_datachannel(channel):
        nonlocal datachannel
        datachannel = channel

        @datachannel.on("message")
        def on_message(message):
            print(f"Received message: {message}")

        @datachannel.on("open")
        def on_open():
            print("DataChannel is open")
            datachannel.send(json.dumps({"test": "DataChannel is working"}))

        @datachannel.on("close")
        def on_close():
            print("DataChannel is closed")

    @pc.on("track")
    def on_track(track: VideoStreamTrack):
        if track.kind == "video":
            video_transform_track = VideoTransformTrack(track, model, sio, data_channel=datachannel)
            pc.addTrack(video_transform_track)
        else:
            pc.addTrack(track)

    # Create the DataChannel if this is the offering side
    if not datachannel:
        datachannel = pc.createDataChannel("chat")

    await run(pc, sio)

    try:
        await sio.connect(
            'https://4761db7d6332.ngrok.app',
            transports=['websocket'],
            socketio_path='/io/webrtc',
            wait_timeout=10,
            auth={'role': 'server', 'userID': server_id},
            namespaces=['/webrtcPeer']
        )
    except socketio.exceptions.ConnectionError as e:
        print(f"Failed to connect to signaling server: {e}")
        await sio.disconnect()

    await sio.wait()

if __name__ == "__main__":
    while True:
        try:
            asyncio.run(main())
        except Exception as e:
            print(f"Error in main: {e}")
            continue