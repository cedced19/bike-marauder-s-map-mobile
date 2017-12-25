import React from 'react';
import { PermissionsAndroid, Alert } from 'react-native';
import { TabNavigator } from 'react-navigation';
import { Container, Header, Content, Button, Text, StyleProvider, Body, Title, Form, Input, Item, Label } from 'native-base';
import getTheme from './native-base-theme/components';
import material from './native-base-theme/variables/material';
import SmsListener from 'react-native-android-sms-listener';
import Contacts from 'react-native-contacts';

export default class App extends React.Component {
  
  render() {
    function startListener (params) {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_SMS, PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      ]).then(function (data) {
        if (data['android.permission.READ_SMS'] !== 'granted') {
          Alert.alert(
            'Error',
            'Cannot get permission to read SMS.',
            [{text: 'OK'}],
            { cancelable: false }
          );
        } else if (data['android.permission.READ_CONTACTS'] !== 'granted') {
          Alert.alert(
            'Error',
            'Cannot get permission to read contacts.',
            [{text: 'OK'}],
            { cancelable: false }
          );
        } else {
          Contacts.getAll((err, contacts) => {
            if(err === 'denied'){
              Alert.alert(
                'Error',
                'An error occurated when reading contacts.',
                [{text: 'OK'}],
                { cancelable: false }
              );
            } else {
              Alert.alert(
                'Info',
                'The app is now collecting coordinates.',
                [{text: 'OK'}],
                { cancelable: false }
              );
            }
          })
        }
      }).catch(function () {
        Alert.alert(
          'Error',
          'Cannot get permissions',
          [{text: 'OK'}],
          { cancelable: false }
        );
      }) 
      /*

      SmsListener.addListener(message => {
        console.error(message);
      }); */
    }

    
    return (
      <StyleProvider style={getTheme(material)}>
        <Container>
          <Header>
            <Body>
              <Title>Bike marauder's map</Title>
            </Body>
          </Header>
        
          <Content contentContainerStyle ={{paddingHorizontal: 10 }}>
            <Text>
              Please set a server adress to send coordinates.
            </Text>
            <Form>
              <Item floatingLabel>
                <Label>Server address</Label>
                <Input />
              </Item>
              <Button style={{marginTop: 10 }} onPress={startListener}>
                <Text>Start collecting coordinates</Text>
              </Button>
            </Form>
           
             
            
          </Content>
        </Container>
      </StyleProvider>
    );
  }
}