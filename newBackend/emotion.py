import numpy as np

import cv2
from keras_core.models import Sequential
from keras_core.layers import Dense, Dropout, Flatten
from keras_core.layers import Conv2D, MaxPooling2D


model = Sequential()

# Add layers
model.add(Conv2D(32, kernel_size=(3, 3), activation='relu', input_shape=(48, 48, 1)))
model.add(Conv2D(64, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Dropout(0.25))

model.add(Conv2D(128, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Conv2D(128, kernel_size=(3, 3), activation='relu'))
model.add(MaxPooling2D(pool_size=(2, 2)))
model.add(Dropout(0.25))

model.add(Flatten())
model.add(Dense(1024, activation='relu'))
model.add(Dropout(0.5))
model.add(Dense(7, activation='softmax'))

emotion_dict: dict[int, str] = {0: "Angry", 1: "Disgusted", 2: "Fearful", 3: "Happy", 4: "Neutral", 5: "Sad", 6: "Surprised"}

def predict_emotion(frame: np.ndarray) -> str:
    """
    Predicts the emotion from a given frame.

    :param frame: The input frame from the webcam.
    :type frame: np.ndarray
    :return: A list of predictions for each detected face in the frame.
    :rtype: list
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    preds = []


    prediction = model.predict(gray, verbose=0)
    preds.append(prediction[0])

    ind = np.argmax(prediction)
    return emotion_dict[ind]
