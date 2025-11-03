#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Liveness Recognition Demo (Randomized Challenges) - OpenCV + MediaPipe
- Install: pip install opencv-python mediapipe numpy
- Run:     python liveness_random_demo.py

This educational demo randomizes a sequence of 3 challenges chosen from:
  1) Blink N times (N in {1,2,3})
  2) Open mouth
  3) Turn head LEFT
  4) Turn head RIGHT
  5) Look UP
  6) Look DOWN

Each challenge has a time window. Pass all to succeed.

DISCLAIMER: Not production security. Add anti-spoof signals (rPPG, depth/IR, texture), server checks,
randomized prompts, and more robust pose estimation for real-world use.
"""

import cv2
import time
import math
import random
import numpy as np

try:
    import mediapipe as mp
except ImportError:
    raise SystemExit("Mediapipe no está instalado. Instala con: pip install mediapipe")

# ------------- Helpers -------------
def euclid(p1, p2):
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])

def aspect_ratio(vert_top, vert_bot, horiz_left, horiz_right):
    v = euclid(vert_top, vert_bot)
    h = euclid(horiz_left, horiz_right)
    return (v / h) if h > 1e-6 else 0.0

def draw_text(img, text, org, scale=0.7, color=(0,255,0), thickness=2, centered=False):
    if centered:
        # Obtener tamaño del texto para centrarlo
        (w_text, h_text), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, thickness)
        org = ((img.shape[1] - w_text) // 2, org[1])  # Centrado horizontal
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, (0,0,0), thickness+3, cv2.LINE_AA)
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness, cv2.LINE_AA)

# ------------- MediaPipe setup -------------
mp_face_mesh = mp.solutions.face_mesh

# Indices (468-point mesh)
LEFT_EYE_H = (33, 133)
LEFT_EYE_V = (159, 145)
RIGHT_EYE_H = (362, 263)
RIGHT_EYE_V = (386, 374)

MOUTH_H = (78, 308)
MOUTH_V = (13, 14)

NOSE_TIP = 1
FOREHEAD = 10     # near top of forehead
CHIN = 152
LEFT_CHEEK = 234  # lateral face (left)
RIGHT_CHEEK = 454 # lateral face (right)

# ------------- Thresholds -------------
EAR_BLINK_THRESH = 0.23
EAR_CONSEC_FRAMES = 2
MAR_OPEN_THRESH = 0.32

# Head pose heuristic thresholds (normalized ratios)
# yaw_ratio = d(nose->left_cheek)/d(nose->right_cheek)
# pitch_ratio = d(forehead->nose)/d(nose->chin)
YAW_LEFT_THRESH = 1.18   # > means turned left (from user's perspective)
YAW_RIGHT_THRESH = 0.85  # < means turned right
PITCH_UP_THRESH = 1.05   # > means looking up (nose closer to forehead relatively)
PITCH_DOWN_THRESH = 0.85 # < means looking down

CHALLENGE_WINDOW_SEC = 7.0
NUM_CHALLENGES = 3
BLINKS_CHOICES = [1, 2, 3]

random.seed()  # seed from system time

# ------------- Landmark helpers -------------
def pt_xy(landmarks, idx, w, h):
    p = landmarks[idx]
    return (int(p.x*w), int(p.y*h))

def compute_metrics(landmarks, w, h):
    # EAR
    l_hl = pt_xy(landmarks, LEFT_EYE_H[0], w, h)
    l_hr = pt_xy(landmarks, LEFT_EYE_H[1], w, h)
    l_vt = pt_xy(landmarks, LEFT_EYE_V[0], w, h)
    l_vb = pt_xy(landmarks, LEFT_EYE_V[1], w, h)
    left_ear = aspect_ratio(l_vt, l_vb, l_hl, l_hr)

    r_hl = pt_xy(landmarks, RIGHT_EYE_H[0], w, h)
    r_hr = pt_xy(landmarks, RIGHT_EYE_H[1], w, h)
    r_vt = pt_xy(landmarks, RIGHT_EYE_V[0], w, h)
    r_vb = pt_xy(landmarks, RIGHT_EYE_V[1], w, h)
    right_ear = aspect_ratio(r_vt, r_vb, r_hl, r_hr)
    ear = (left_ear + right_ear) / 2.0

    # MAR
    m_l = pt_xy(landmarks, MOUTH_H[0], w, h)
    m_r = pt_xy(landmarks, MOUTH_H[1], w, h)
    m_t = pt_xy(landmarks, MOUTH_V[0], w, h)
    m_b = pt_xy(landmarks, MOUTH_V[1], w, h)
    mar = aspect_ratio(m_t, m_b, m_l, m_r)

    # Head pose heuristics (ratios)
    nose = pt_xy(landmarks, NOSE_TIP, w, h)
    left_ck = pt_xy(landmarks, LEFT_CHEEK, w, h)
    right_ck = pt_xy(landmarks, RIGHT_CHEEK, w, h)
    forehead = pt_xy(landmarks, FOREHEAD, w, h)
    chin = pt_xy(landmarks, CHIN, w, h)

    d_left = euclid(nose, left_ck)
    d_right = euclid(nose, right_ck)
    yaw_ratio = (d_left / d_right) if d_right > 1e-6 else 1.0

    d_for = euclid(forehead, nose)
    d_chi = euclid(nose, chin)
    pitch_ratio = (d_for / d_chi) if d_chi > 1e-6 else 1.0

    return ear, mar, yaw_ratio, pitch_ratio

# ------------- Challenge logic -------------
class Challenge:
    def __init__(self, kind, target=None):
        self.kind = kind  # "blink", "mouth", "turn_left", "turn_right", "look_up", "look_down"
        self.target = target  # for blink: required count
        self.reset()

    def reset(self):
        self.start_time = None
        self.done = False
        self.success = False
        self.counter = 0
        self._blink_consec = 0

    def start(self):
        self.start_time = time.time()

    def time_left(self):
        if self.start_time is None: return CHALLENGE_WINDOW_SEC
        return max(0.0, CHALLENGE_WINDOW_SEC - (time.time() - self.start_time))

    def update(self, ear, mar, yaw_ratio, pitch_ratio):
        if self.done: 
            return

        # Blink challenge
        if self.kind == "blink":
            if ear < EAR_BLINK_THRESH:
                self._blink_consec += 1
            else:
                if self._blink_consec >= EAR_CONSEC_FRAMES:
                    self.counter += 1
                self._blink_consec = 0

            if self.counter >= self.target:
                self.success = True
                self.done = True

        # Mouth open
        elif self.kind == "mouth":
            if mar > MAR_OPEN_THRESH:
                self.success = True
                self.done = True

        # Head yaw left/right
        elif self.kind == "turn_left":
            if yaw_ratio > YAW_LEFT_THRESH:
                self.success = True
                self.done = True
        elif self.kind == "turn_right":
            if yaw_ratio < YAW_RIGHT_THRESH:
                self.success = True
                self.done = True

        # Head pitch up/down
        elif self.kind == "look_up":
            if pitch_ratio > PITCH_UP_THRESH:
                self.success = True
                self.done = True
        elif self.kind == "look_down":
            if pitch_ratio < PITCH_DOWN_THRESH:
                self.success = True
                self.done = True

        # Timeout
        if self.time_left() <= 0 and not self.done:
            self.done = True  # failed (success remains False)

    def label(self):
        if self.kind == "blink":
            return f"Parpadea {self.target} vez/veces"
        mapping = {
            "mouth": "Abre la boca",
            "turn_left": "Gira la cabeza a la IZQUIERDA",
            "turn_right": "Gira la cabeza a la DERECHA",
            "look_up": "Mira hacia ARRIBA",
            "look_down": "Mira hacia ABAJO",
        }
        return mapping[self.kind]

def random_challenges():
    pool = [
        Challenge("blink", target=random.choice(BLINKS_CHOICES)),
        Challenge("mouth"),
        Challenge("turn_left"),
        Challenge("turn_right"),
        Challenge("look_up"),
        Challenge("look_down"),
    ]
    # ensure blink appears at most once
    # pick 3 unique challenges
    chosen = []
    # Always include one action that isn't blink to encourage variety
    chosen.append(random.choice([c for c in pool if c.kind != "blink"]))
    # Maybe include blink
    if random.random() < 0.8:
        chosen.append(Challenge("blink", target=random.choice(BLINKS_CHOICES)))
    # Fill remaining with different kinds
    kinds_taken = {c.kind for c in chosen}
    remaining = [c for c in pool if c.kind not in kinds_taken and c.kind != "blink"]
    random.shuffle(remaining)
    while len(chosen) < NUM_CHALLENGES and remaining:
        chosen.append(remaining.pop())
    # In rare case duplicates or shortage, pad from pool ensuring uniqueness
    kinds_taken = set()
    final = []
    for c in chosen:
        if c.kind not in kinds_taken:
            final.append(c); kinds_taken.add(c.kind)
    while len(final) < NUM_CHALLENGES:
        candidate = random.choice(pool)
        if candidate.kind not in kinds_taken:
            final.append(candidate); kinds_taken.add(candidate.kind)
    return final

def run():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise SystemExit("No se puede abrir la cámara (VideoCapture(0)).")

    with mp_face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as mesh:

        stage = "intro"  # intro -> active -> done
        challenges = random_challenges()
        idx = 0

        start_pressed = False
        total_success = 0

        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = mesh.process(rgb)

            if results.multi_face_landmarks:
                lms = results.multi_face_landmarks[0].landmark
                ear, mar, yaw_ratio, pitch_ratio = compute_metrics(lms, w, h)

                if stage == "intro":
                    draw_text(frame, "Pulsa ESPACIO para iniciar (3 retos).", (10, 50), 0.8, (0,255,255), centered=True)
                    draw_text(frame, "ESC para salir.", (10, 100), 0.7, (180,180,180), centered=True)

                elif stage == "active":
                    if idx < len(challenges):
                        ch = challenges[idx]
                        if ch.start_time is None: ch.start()

                        # Update challenge with current measurements
                        ch.update(ear, mar, yaw_ratio, pitch_ratio)

                        # UI
                        draw_text(frame, f"Reto {idx+1}/{len(challenges)}: {ch.label()}", (10, 50), 0.85, (0,255,255))
                        draw_text(frame, f"Tiempo restante: {ch.time_left():.1f}s", (10, 80), 0.8, (0,255,255))
                        if ch.kind == "blink":
                            draw_text(frame, f"Parpadeos: {ch.counter}/{ch.target}", (10, 120), 0.8, (0,255,0))

                        if ch.done:
                            if ch.success: total_success += 1
                            idx += 1
                    else:
                        stage = "done"

                elif stage == "done":
                    passed = (total_success == len(challenges))
                    msg = "LIVENESS: APROBADO" if passed else "LIVENESS: RECHAZADO"
                    color = (0,255,0) if passed else (0,0,255)
                    draw_text(frame, msg, (10, 80), 1.0, color, centered=True)
                    draw_text(frame, "Pulsa R para reiniciar o ESC para salir.", (10, 120), 0.8, (200,200,200),centered=True)

            else:
                draw_text(frame, "No se detecta rostro. Iluminacion/encuadre.", (10, 100), 0.7, (0,0,255), centered=True)

            cv2.imshow("Liveness Random Challenges", frame)
            key = cv2.waitKey(1) & 0xFF
            if key == 27:  # ESC
                break
            elif key == ord(' '):
                if stage == "intro":
                    stage = "active"
            elif key == ord('r'):
                # reset
                challenges = random_challenges()
                idx = 0
                total_success = 0
                for c in challenges: c.reset()
                stage = "intro"

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run()
