import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private targetUserID: string | null = null; // Store targetUserID in the class
  private iceCandidateQueue: RTCIceCandidateInit[] = []; // Queue for ICE candidates
  private remoteDescriptionSet: boolean = false; // Flag for remote description set

  constructor(
    private onIceCandidate: (candidate: any) => void,
    private onTrack: (stream: MediaStream) => void,
    private onDataChannelMessage: (message: string) => void,
    private onLocalStream: (localstream: MediaStream) => void,
    private onOfferOrAnswer: (sdp: RTCSessionDescriptionInit) => void,
    targetUserID: string,
  ) {
    this.targetUserID = targetUserID;
    this.setupWebRTC();
  }

  private setupWebRTC(): void {
    const pcConfig: RTCConfiguration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };
    this.pc = new RTCPeerConnection(pcConfig);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onTrack(this.remoteStream);
      }
    };

    this.pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    // If you're the offerer, create the data channel
    this.dataChannel = this.pc.createDataChannel('chat');
    this.setupDataChannel(this.dataChannel);
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    this.dataChannel.onopen = () => console.log('Data channel is open');
    this.dataChannel.onclose = () => console.log('Data channel is closed');
    this.dataChannel.onmessage = (event) => {
      this.onDataChannelMessage(event.data);
    };
  }

  public async setupMediaStream(): Promise<void> {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          mandatory: {
            minWidth: 500,
            minHeight: 300,
            minFrameRate: 30,
          },
          facingMode: 'user',
        },
      });

      if (stream) {
        this.localStream = stream;
        this.onLocalStream(this.localStream);

        stream.getTracks().forEach((track) => {
          this.pc?.addTrack(track, stream);
        });
      }
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }
  }

  public async createOffer(): Promise<void> {
    if (!this.targetUserID) {
      console.error('Target User ID is not set');
      return;
    }
    await this.setupMediaStream();
    const offer = await this.pc?.createOffer({ offerToReceiveVideo: 1 });
    if (offer) {
      await this.pc?.setLocalDescription(offer);
      this.onOfferOrAnswer(offer);
    }
  }

  public async createAnswer(): Promise<void> {
    if (!this.targetUserID) {
      console.error('Target User ID is not set');
      return;
    }
    const answer = await this.pc?.createAnswer();
    if (answer) {
      await this.pc?.setLocalDescription(answer);
      this.onOfferOrAnswer(answer);
    }
  }

  public async handleRemoteSDP(sdpData: RTCSessionDescriptionInit): Promise<void> {
    try {
      const sessionDescription = new RTCSessionDescription(sdpData);

      if (this.pc) {
        if (sdpData.type === 'offer') {
          await this.pc.setRemoteDescription(sessionDescription);
          this.remoteDescriptionSet = true;

          if (!this.localStream) {
            await this.setupMediaStream();
          }

          const answer = await this.createAnswer();
          if (answer) {
            console.log('Answer created and local description set:', answer);
          }
        } else if (sdpData.type === 'answer') {
          await this.pc.setRemoteDescription(sessionDescription);
          this.remoteDescriptionSet = true;
        }

        await this.processIceCandidateQueue();
      }
    } catch (error) {
      console.error('Error handling remote SDP:', error);
      throw error;
    }
  }

  public handleIceCandidate(candidate: RTCIceCandidateInit): void {
    if (this.remoteDescriptionSet) {
      try {
        const iceCandidate = new RTCIceCandidate(candidate);
        this.pc?.addIceCandidate(iceCandidate).catch((error) => {
          console.error('Error adding ICE candidate:', error);
          throw error;
        });
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    } else {
      this.iceCandidateQueue.push(candidate);
    }
  }

  private async processIceCandidateQueue(): Promise<void> {
    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      if (candidate) {
        await this.handleIceCandidate(candidate);
      }
    }
  }

  public sendMessage(message: string): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(message);
    } else {
      console.warn('Data channel is not open, message not sent');
    }
  }

  public stopMediaStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  public endCall(): void {
    this.stopMediaStream();

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    this.remoteStream = null;
  }
}