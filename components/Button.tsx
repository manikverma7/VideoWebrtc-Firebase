import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

interface Props {
  onPress?: any;
  iconName: string;
  backgroundColor: string;
  style?: any;
}

const Button = (props: Props) => {
  return (
    <View>
      <TouchableOpacity
        onPress={props.onPress}
        style={[
          {backgroundColor: props.backgroundColor},
          props.style,
          styles.button,
        ]}>
        <Icon name={props.iconName} color="#fff" size={22} />
      </TouchableOpacity>
    </View>
  );
};

export default Button;

const styles = StyleSheet.create({
  button: {
    height: 60,
    width: 60,
    padding: 10,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
});
