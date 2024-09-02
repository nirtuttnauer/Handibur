import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private pc2: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteStream2: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private dataChannel2: RTCDataChannel | null = null;
  private targetUserID: string | null = null;
  private secondTargetUserID: string | null = null;
  private iceCandidateQueue: RTCIceCandidateInit[] = [];
  private iceCandidateQueue2: RTCIceCandidateInit[] = [];
  private isVideoEnabled: boolean = true;
  private isAudioEnabled: boolean = true;
  private callEndedByPeer = false; // Flag to track if the call was ended by the other peer

  constructor(
    private onIceCandidate: (candidate: any, connectionIndex: number) => void,
    private onTrack: (stream: MediaStream, streamIndex: number) => void,
    private onDataChannelMessage: (message: string, channelIndex: number) => void,
    private onLocalStream: (localStream: MediaStream) => void,
    private onOfferOrAnswer: (sdp: RTCSessionDescriptionInit, connectionIndex: number) => void,
    private emitEndCall: () => void,
    targetUserID: string,
    secondTargetUserID: string,
  ) {
    this.targetUserID = targetUserID;
    this.secondTargetUserID = secondTargetUserID;

    // Initialize MediaStream early
    this.setupMediaStream().then(() => {
      // Setup WebRTC connections after the MediaStream is ready
      this.setupWebRTC(1);
      this.setupWebRTC(2);
    });
  }

  private async setupMediaStream(): Promise<void> {
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
        console.log('Media stream set up successfully');
      } else {
        console.error('Failed to initialize media stream');
      }
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }
  }

  private async setupWebRTC(connectionIndex: number): Promise<void> {
    const pcConfig: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        {
          urls: 'turn:3.76.106.0:3478',
          username: 'handy',
          credential: 'karkar'
        }
      ]
    };

    try {
      let pc: RTCPeerConnection | null = null;

      if (connectionIndex === 1) {
        if (!this.pc) {
          this.pc = new RTCPeerConnection(pcConfig);
          pc = this.pc;
          console.log('PeerConnection 1 initialized');
        }
      } else if (connectionIndex === 2) {
        if (!this.pc2) {
          this.pc2 = new RTCPeerConnection(pcConfig);
          pc = this.pc2;
          console.log('PeerConnection 2 initialized');
        }
      }

      if (pc) {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            this.onIceCandidate(event.candidate, connectionIndex);
          }
        };
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            if (connectionIndex === 1) {
              this.remoteStream = event.streams[0];
              this.onTrack(this.remoteStream, 1);
            } else if (connectionIndex === 2) {
              this.remoteStream2 = event.streams[0];
              this.onTrack(this.remoteStream2, 2);
            }
          }
        };
        pc.ondatachannel = (event) => {
          this.setupDataChannel(event.channel, connectionIndex);
        };

        // Add local tracks to the peer connection
        if (this.localStream) {
          this.localStream.getTracks().forEach((track) => {
            pc?.addTrack(track, this.localStream!);
          });
        }

        // Create a data channel
        if (connectionIndex === 1) {
          this.dataChannel = pc.createDataChannel('chat');
          this.setupDataChannel(this.dataChannel, 1);
        } else if (connectionIndex === 2) {
          this.dataChannel2 = pc.createDataChannel('chat');
          this.setupDataChannel(this.dataChannel2, 2);
        }
      }
    } catch (error) {
      console.error(`Error setting up WebRTC for connection ${connectionIndex}:`, error);
    }
  }

  private setupDataChannel(channel: RTCDataChannel, channelIndex: number): void {
    if (channelIndex === 1) {
      this.dataChannel = channel;
    } else if (channelIndex === 2) {
      this.dataChannel2 = channel;
    }

    channel.onopen = () => console.log(`Data channel ${channelIndex} is open`);
    channel.onclose = () => console.log(`Data channel ${channelIndex} is closed`);
    channel.onmessage = (event) => {
      console.log(`Message received on data channel ${channelIndex}: ${event.data}`);
      this.onDataChannelMessage(event.data, channelIndex);

      // Forward the message from dataChannel2 to dataChannel1
      if (channelIndex === 2 && this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(event.data);
        console.log(`Message forwarded from data channel 2 to data channel 1: ${event.data}`);
      }
    };
  }

  public async createOffer(connectionIndex: number): Promise<void> {
    let pc: RTCPeerConnection | null = null;

    if (connectionIndex === 1) {
      pc = this.pc;
    } else if (connectionIndex === 2) {
      pc = this.pc2;
    }

    if (!pc) {
      console.error(`PeerConnection ${connectionIndex} not initialized`);
      return;
    }

    try {
      const offer = await pc.createOffer({ offerToReceiveVideo: 1 });
      await pc.setLocalDescription(offer);
      this.onOfferOrAnswer(offer, connectionIndex);
    } catch (error) {
      console.error(`Error creating offer for connection ${connectionIndex}:`, error);
    }
  }

  public async createAnswer(connectionIndex: number = 1): Promise<void> {
    let pc: RTCPeerConnection | null = null;

    if (connectionIndex === 1) {
      pc = this.pc;
    } else if (connectionIndex === 2) {
      pc = this.pc2;
    }

    if (!pc) {
      console.error(`PeerConnection ${connectionIndex} not initialized`);
      return;
    }

    try {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.onOfferOrAnswer(answer, connectionIndex);
    } catch (error) {
      console.error(`Error creating answer for connection ${connectionIndex}:`, error);
    }
  }

  public async setSecondTargetUserID(secondTargetUserID: string): Promise<void> {
    this.secondTargetUserID = secondTargetUserID;
  }

  public async handleRemoteSDP(sdpData: RTCSessionDescriptionInit, connectionIndex: number): Promise<void> {
    let pc: RTCPeerConnection | null = null;

    if (connectionIndex === 1) {
      pc = this.pc;
    } else if (connectionIndex === 2) {
      pc = this.pc2;
    }

    try {
      const sessionDescription = new RTCSessionDescription(sdpData);

      if (pc) {
        await pc.setRemoteDescription(sessionDescription);

        if (sdpData.type === 'offer') {
          await this.createAnswer(connectionIndex);
        }

        await this.processIceCandidateQueue(connectionIndex);
      }
    } catch (error) {
      console.error(`Error handling remote SDP for connection ${connectionIndex}:`, error);
    }
  }

  public handleIceCandidate(candidate: RTCIceCandidateInit, connectionIndex: number): void {
    let pc: RTCPeerConnection | null = null;

    if (connectionIndex === 1) {
      pc = this.pc;
    } else if (connectionIndex === 2) {
      pc = this.pc2;
    }

    if (pc?.remoteDescription) {
      const iceCandidate = new RTCIceCandidate(candidate);
      pc.addIceCandidate(iceCandidate).catch((error) => {
        console.error('Error adding ICE candidate:', error);
      });
    } else {
      if (connectionIndex === 1) {
        this.iceCandidateQueue.push(candidate);
      } else if (connectionIndex === 2) {
        this.iceCandidateQueue2.push(candidate);
      }
      console.log(`ICE candidate queued for connection index ${connectionIndex}`);
    }
  }

  private async processIceCandidateQueue(connectionIndex: number): Promise<void> {
    let iceCandidateQueue: RTCIceCandidateInit[] = [];

    if (connectionIndex === 1) {
      iceCandidateQueue = this.iceCandidateQueue;
    } else if (connectionIndex === 2) {
      iceCandidateQueue = this.iceCandidateQueue2;
    }

    while (iceCandidateQueue.length > 0) {
      const candidate = iceCandidateQueue.shift();
      if (candidate) {
        await this.handleIceCandidate(candidate, connectionIndex);
      }
    }
  }

  public sendMessage(message: string, channelIndex: number = 1): void {
    let dataChannel: RTCDataChannel | null = null;

    if (channelIndex === 1) {
      dataChannel = this.dataChannel;
    } else if (channelIndex === 2) {
      dataChannel = this.dataChannel2;
    }

    if (dataChannel?.readyState === 'open') {
      dataChannel.send(message);
      console.log(`Message sent on data channel ${channelIndex}: ${message}`);

      // If sending on dataChannel2, also forward to dataChannel1
      if (channelIndex === 2 && this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(message);
        console.log(`Message forwarded from data channel 2 to data channel 1: ${message}`);
      }
    } else {
      console.warn(`Data channel ${channelIndex} is not open, message not sent`);
    }
  }

  public toggleVideo(): void {
    if (this.localStream) {
      const localVideoTrack = this.localStream.getVideoTracks()[0];
      if (localVideoTrack) {
        localVideoTrack.enabled = !localVideoTrack.enabled;
        this.isVideoEnabled = localVideoTrack.enabled;
        console.log('Local video track state toggled:', localVideoTrack.enabled);
      }
    }
  }

  public toggleAudio(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isAudioEnabled = audioTrack.enabled;
        console.log('Local audio track state toggled:', audioTrack.enabled);
      }
    }
  }

  public stopMediaStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
      console.log('Local media stream stopped');
    }
  }

  public endCall(): void {
    // Check if the call has already been ended by the other peer
    if (this.callEndedByPeer) {
      console.log('Call already ended by the other peer. Cleaning up...');
    } else {
      console.log('Ending call and notifying the other peer');
      this.emitEndCall(); // Emit the endCall signal to the other peer
    }

    // Proceed with the call termination process
    this.stopMediaStream();

    // Close the first peer connection and data channel
    if (this.pc) {
      this.pc.close();
      this.pc = null;
      console.log('PeerConnection 1 closed');
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
      console.log('DataChannel 1 closed');
    }
    this.remoteStream = null;

    // Close the second peer connection and data channel if it exists
    if (this.pc2) {
      this.pc2.close();
      this.pc2 = null;
      console.log('PeerConnection 2 closed');
    }
    if (this.dataChannel2) {
      this.dataChannel2.close();
      this.dataChannel2 = null;
      console.log('DataChannel 2 closed');
    }
    this.remoteStream2 = null;

    // Clear ICE candidate queues
    this.iceCandidateQueue = [];
    this.iceCandidateQueue2 = [];
    console.log('ICE candidate queues cleared');

    // Reset the callEndedByPeer flag
    this.callEndedByPeer = false;
  }

  public handleEndCallFromPeer(): void {
    // Handle the endCall signal from the other peer
    console.log('Received endCall from the other peer');
    this.callEndedByPeer = true;
    this.endCall(); // Proceed to end the call on this side
  }
}