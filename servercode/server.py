from servercode.imports import *
from servercode.modellogic import *

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
    await run(pc, sio, load_model, user_id, target_user_id)
    await sio.wait()

if __name__ == "__main__":
    asyncio.run(main())