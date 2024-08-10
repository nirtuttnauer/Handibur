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
import numpy as np
from tensorflow.keras import Model, Input, layers
from tensorflow.keras.layers import Dense, Dropout, Flatten, Conv1D, MaxPooling1D, Bidirectional, LSTM, TimeDistributed, BatchNormalization
from tensorflow.keras.losses import Loss
from tensorflow.keras.callbacks import ReduceLROnPlateau, EarlyStopping, ModelCheckpoint
from sklearn.utils import class_weight
from tensorflow.keras.metrics import MeanSquaredError