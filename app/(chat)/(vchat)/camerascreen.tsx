/* eslint-disable @typescript-eslint/no-var-requires */
'use client'
import * as React from "react";
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import {
  Tensor,
  TensorflowModel,
  useTensorflowModel,
} from "react-native-fast-tflite";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useRouter } from "expo-router";
import { useSharedValue, runOnJS, useAnimatedReaction } from "react-native-reanimated";


// Function to convert tensor to string
function tensorToString(tensor: Tensor): string {
  return `\n  - ${tensor.dataType} ${tensor.name}[${tensor.shape}]`;
}

// Function to convert model to string
function modelToString(model: TensorflowModel): string {
  return (
    `TFLite Model (${model.delegate}):\n` +
    `- Inputs: ${model.inputs.map(tensorToString).join("")}\n` +
    `- Outputs: ${model.outputs.map(tensorToString).join("")}`
  );
}

// Function to convert detections to a string
function detectionsToString(detections: any[]): string {
  'worklet';
  return detections.map(d => `Class: ${d.class}, Boxes: ${d.box.ymin},${d.box.xmin},${d.box.ymax},${d.box.xmax}`).join('\n');
}

export default function App(): React.ReactNode {
  const labelText = useSharedValue<string>("No detections yet");
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("front");
  const router = useRouter();
  const labelRef = React.useRef<Text>(null);

  // Load the TensorFlow Lite model
  const model = useTensorflowModel(
    require("@/assets/models/od.tflite"),
  );
  const actualModel = model.state === "loaded" ? model.model : undefined;
  console.log(model.model);

  // Log model information once it is loaded
  React.useEffect(() => {
    if (actualModel == null) {
      console.log("Model not loaded yet.");
      return;
    }
    console.log(`Model loaded! Shape:\n${modelToString(actualModel)}`);
  }, [actualModel]);


  // Shared value for detections
  const detections = useSharedValue<string>("No detections yet");

  // Function to update the label text from the UI thread
  const updateLabel = (text: string) => {
    'worklet';
    console.log(text);

  };

  // Frame processor function
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (actualModel == null) {
      return;
    }
    console.log(`Frame: ${frame.width}x${frame.height} (${frame.pixelFormat})`)
    const data = new Uint8Array(frame.toArrayBuffer());
    // const resized = resize(frame, {
    //   scale: {
    //     width: 854,
    //     height: 480,
    //   },
    //   pixelFormat: "rgb",
    //   dataType: "uint8",
    // });
    // const framedata = new Uint16Array(frame.buffer);
    const outputs = actualModel.run([data]);
    console.log(outputs);
    // const num_detections = outputs[0];
    // const detection_boxes = outputs[1];
    // const detection_classes = outputs[2];
    // const detection_scores = outputs[3];

    // const CONFIDENCE_THRESHOLD = 24;

    // const detectedItems = [];
    // for (let i = 0; i < num_detections.length; i++) {
    //   const confidence = detection_scores[i];
    //   if (confidence > CONFIDENCE_THRESHOLD) {
    //     const ymin = detection_boxes[i * 4];
    //     const xmin = detection_boxes[i * 4 + 1];
    //     const ymax = detection_boxes[i * 4 + 2];
    //     const xmax = detection_boxes[i * 4 + 3];

    //     const detection = {
    //       class: detection_classes[i],
    //       confidence: confidence,
    //       box: { ymin, xmin, ymax, xmax },
    //     };
    //     detectedItems.push(detection);
    //   }
    // }
    // const detectionText = detectionsToString(detectedItems);

    // const detect = detectedItems.some(d => d.class > 0.7) ? detectionText : 'No high-confidence detections';
    // updateLabel(detections.value);
    // console.log(detect);
  }, [actualModel]);

  // Request camera permissions on mount
  React.useEffect(() => {
    (async () => {
      await requestPermission();
    })();
  }, [requestPermission]);

  console.log(`Model: ${model.state} (${model.model != null})`);

  return (
    <View style={styles.container}>
      {hasPermission && device != null ? (
        <Camera
          device={device}
          style={StyleSheet.absoluteFill}
          isActive={true}
          frameProcessor={frameProcessor}
          pixelFormat="yuv"
        />
      ) : (
        <Text>No Camera available.</Text>
      )}

      {model.state === "loading" && (
        <ActivityIndicator size="small" color="white" />
      )}

      {model.state === "error" && (
        <Text>Failed to load model! {model.error.message}</Text>
      )}
      <View style={styles.label}>
        <Text ref={labelRef} style={styles.labelText}>No detections yet</Text>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.back()}
        accessibilityLabel="Go Back"
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    position: "absolute",
    bottom: 20,
    left: "50%",
    transform: [{ translateX: -50 }],
    backgroundColor: "blue",
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  label: {
    zIndex: 1,
    position: "absolute",
    top: 50,
  },
  labelText: {
    color: "white",
    fontSize: 16,
  },
});