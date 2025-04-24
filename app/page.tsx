'use client'
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const socket: Socket = io("ws://192.168.214.184:8080");

const Home = () => {
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    // Access user's microphone
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
        }

        peerRef.current = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        // Add all media tracks to the peer connection
        stream.getTracks().forEach((track) => {
          peerRef.current?.addTrack(track, stream);
        });

        // Handle remote stream
        peerRef.current.ontrack = (event) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        };

        // Handle ICE candidate
        peerRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", event.candidate);
          }
        };
      });

    // Listen for incoming offer
    socket.on("offer", async (offer: RTCSessionDescriptionInit) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        socket.emit("answer", answer);
      }
    });

    // Listen for incoming answer
    socket.on("answer", async (answer: RTCSessionDescriptionInit) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Listen for ICE candidates
    socket.on("ice-candidate", async (candidate: RTCIceCandidate) => {
      try {
        if (peerRef.current) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.error(e);
      }
    });
  }, []);

  // Start the call by creating an offer
  const startCall = async () => {
    if (peerRef.current) {
      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);
      socket.emit("offer", offer);
    }
  };

  return (
    <div>
      <h1>Offline Audio Call</h1>
      <button onClick={startCall}>Start Call</button>
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
};

export default Home;