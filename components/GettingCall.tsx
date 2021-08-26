import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Button from './Button';

interface Props {
  hangup: () => void;
  join: () => void;
}

const GettingCall = (props: Props) => {
  return (
    <View style={styles.container}>
      <View style={styles.bContainer}>
        <Button
          iconName="phone"
          backgroundColor="green"
          onPress={props.join}
          style={{marginRight: 30}}
        />
        <Button
          iconName="phone"
          backgroundColor="red"
          onPress={props.hangup}
          style={{marginLeft: 30}}
        />
      </View>
    </View>
  );
};

export default GettingCall;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  bContainer: {
    flexDirection: 'row',
    bottom: 30,
  },
});
