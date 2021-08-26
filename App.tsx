import React, {useState, useRef, useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Button from './components/Button';
import GettingCall from './components/GettingCall';
import Video from './components/Video';
import Utils from './components/Utils';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals,
  EventOnAddStream,
} from 'react-native-webrtc';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

const configuration = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};

const App = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>();
  const [gettingCall, setGettingCall] = useState(false);
  const pc = useRef<RTCPeerConnection>();
  const connecting = useRef(false);

  useEffect(() => {
    const cRef = firestore().collection('meet').doc('chatId');

    const subscribe = cRef.onSnapshot(snapshot => {
      const data = snapshot.data();
      if (pc.current && !pc.current.remoteDescription && data && data.answer) {
        pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }

      if (data && data.offer && !connecting.current) {
        setGettingCall(true);
      }
    });

    const subscribeDelete = cRef.collection('callee').onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type == 'removed') {
          hangUp();
        }
      });
    });

    return () => {
      subscribe();
      subscribeDelete();
    };
  }, []);

  const setUpWebRtc = async () => {
    pc.current = new RTCPeerConnection(configuration);

    // Get the audio and video stream for the call

    const stream = await Utils.getStream();

    if (stream) {
      setLocalStream(stream);
      pc.current.addStream(stream);
    }

    // Get the remote stream once it is available
    pc.current.onAddStream = (event: EventOnAddStream) => {
      setRemoteStream(event.stream);
    };
  };
  const create = async () => {
    console.log('Calling');
    connecting.current = true;

    //setUp Webrtc
    await setUpWebRtc();

    // Document for the Call
    const cRef = firestore().collection('meet').doc('chatId');

    // Exchange the ICE candidates btw the caller and callee
    collectIceCandidates(cRef, 'caller', 'callee');

    if (pc.current) {
      // Create the offer for the call
      //Store the offer under the document

      const offer = await pc.current.createOffer();

      pc.current.setLocalDescription(offer);

      const cWithOffer = {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      };

      cRef.set(cWithOffer);
    }
  };
  const join = async () => {
    console.log('Joining call');
    connecting.current = true;
    setGettingCall(false);

    const cRef = firestore().collection('meet').doc('chatId');
    const offer = (await cRef.get()).data()?.offer;

    if (offer) {
      await setUpWebRtc();
    }

    collectIceCandidates(cRef, 'caller', 'callee');

    if (pc.current) {
      pc.current.setRemoteDescription(new RTCSessionDescription(offer));
    }

    const answer = await pc.current.createAnswer();
    pc.current.setLocalDescription(answer);

    const cWithAnswer = {
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
    };

    cRef.update(cWithAnswer);
  };
  const hangUp = async () => {
    setGettingCall(false);
    connecting.current = false;
    streamCleanUp();
    firestoreCleanUp();

    if (pc.current) {
      pc.current.close();
    }
  };

  // Helper function
  const streamCleanUp = async () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop);
      localStream.release();
    }
    setLocalStream(null);
    setRemoteStream(null);
  };
  const firestoreCleanUp = async () => {
    const cRef = firestore().collection('meet').doc('chatId');

    if (cRef) {
      const calleeCandidate = await cRef.collection('callee').get();

      calleeCandidate.forEach(async candidate => {
        await candidate.ref.delete();
      });

      const callerCandidate = await cRef.collection('caller').get();

      callerCandidate.forEach(async candidate => {
        await candidate.ref.delete();
      });

      cRef.delete();
    }
  };

  const collectIceCandidates = async (
    cRef: FirebaseFirestoreTypes.DocumentReference<FirebaseFirestoreTypes.DocumentData>,
    localName: string,
    remoteName: string,
  ) => {
    const candidateCollection = cRef.collection(localName);

    if (pc.current) {
      // on New ICE candidate add it to firestore
      pc.current.onicecandidate = event => {
        if (event) {
          candidateCollection.add(event.candidate);
        }
      };
    }

    //Get the ICE candidate and add it to firestore and local PC
    cRef.collection(remoteName).onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type == 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());

          pc.current?.addIceCandidate(candidate);
        }
      });
    });
  };

  // Display the gettingCall component
  if (gettingCall) {
    return <GettingCall hangup={hangUp} join={join} />;
  }

  // Display local stream on calling
  // Displays both local and remote Stream once call is connected
  if (localStream) {
    return (
      <Video
        hangup={hangUp}
        localStream={localStream}
        remoteStream={remoteStream}
      />
    );
  }

  // Displays the call button
  return (
    <View style={styles.container}>
      <Button iconName="video" backgroundColor="grey" onPress={create} />
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
