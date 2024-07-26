import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, PermissionsAndroid } from 'react-native';
import { Camera } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
import { RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc';
import { supabase } from '@/context/supabaseClient';

const TensorCamera = cameraWithTensors(Camera as any);

const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const peerConnection = new RTCPeerConnection(configuration);

async function requestPermissions() {
  const { status } = await Camera.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    alert('Sorry, we need camera permissions to make this work!');
  }
  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
}

async function startCall() {
  const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localStream.getTracks().forEach(track => peerConnection.addTrack(track as any, localStream as any));

  const offer = await peerConnection.createOffer({});
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

  if (peerConnection.localDescription) {
    await supabase.from('signaling').insert([{ type: 'offer', sdp: peerConnection.localDescription.sdp }]);
  } else {
    console.error('Local description is null.');
  }
}

supabase.channel('signaling')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signaling' }, async (payload: { new: { type: string; sdp: any; }; }) => {
    if (payload.new.type === 'offer') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.new.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

      if (peerConnection.localDescription) {
        await supabase.from('signaling').insert([{ type: 'answer', sdp: peerConnection.localDescription.sdp }]);
      } else {
        console.error('Local description is null.');
      }
    } else if (payload.new.type === 'answer') {
      peerConnection.setRemoteDescription(new RTCSessionDescription(payload.new.sdp));
    }
  })
  .subscribe();

peerConnection.ontrack = (event: RTCTrackEvent) => {
  const [remoteStream] = event.streams;
  // Attach remoteStream to a video component
};

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      await tf.ready();
      const loadedModel = await mobilenet.load();
      setModel(loadedModel);
    })();
  }, []);

  const handleCameraStream = (images: IterableIterator<tf.Tensor3D>) => {
    const loop = async () => {
      const nextImageTensor = images.next().value;
      if (model && nextImageTensor) {
        const predictions = await model.classify(nextImageTensor);
        console.log(predictions);
        requestAnimationFrame(loop);
      }
    };
    loop();
  };

  const textureDims = Platform.OS === 'ios'
    ? { width: 1080, height: 1920 }
    : { width: 1600, height: 1200 };

  const tensorDims = { width: 152, height: 200 };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <TensorCamera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.back}
        cameraTextureHeight={textureDims.height}
        cameraTextureWidth={textureDims.width}
        resizeHeight={tensorDims.height}
        resizeWidth={tensorDims.width}
        resizeDepth={3}
        onReady={handleCameraStream}
        autorender={true}
        useCustomShadersToResize={true}
      />
      <TouchableOpacity onPress={startCall} style={styles.button}>
        <Text style={styles.buttonText}>Start Call</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  button: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});