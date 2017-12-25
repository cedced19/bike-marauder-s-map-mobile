import React from 'react';
import { PermissionsAndroid, Alert } from 'react-native';
import { TabNavigator } from 'react-navigation';
import { Container, Header, Content, Button, Text, StyleProvider, Body, Title, Form, Input, Item, Label } from 'native-base';
import getTheme from './native-base-theme/components';
import material from './native-base-theme/variables/material';
import Contacts from 'react-native-contacts';
import SmsAndroid from 'react-native-sms-android';

function isUrl (url) {
  return /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(url)
}

function getLatLng (body) {
  var arr = body.split(':')[1].replace('https', '').split(' ');
  arr.forEach(function (i, k) {
    if (i=='') arr.splice(k, 1);
    i.replace('.', ',')
  });
  if (arr.length < 2) {
    return false;
  }
  if (isNaN(arr[0]) || isNaN(arr[1])) {
    return false;
  }
  return {lat: arr[0], lng: arr[1]};
}

function isPhoneNumberInArray (targetNum, phoneNumbers) {
  var numArray = [];
  for (var k in phoneNumbers) {
    numArray.push(phoneNumbers[k].number)
  }
  var targSanitized   = targetNum.replace (/[^\d]/g, "")
                                 .replace (/^.*(\d{10})$/, "$1");
  var arraySanitized  = numArray.join ('Á').replace (/[^\dÁ]/g, "") + 'Á';

  return (new RegExp (targSanitized + 'Á')).test(arraySanitized);
}                                    

function getContact (number, contacts) {
  for (var k in contacts) {
    if (isPhoneNumberInArray(number, contacts[k].phoneNumbers)) {
      return contacts[k].givenName;
    }
  }
  return false;
}

function checkSMS (server, lastUpdate, checkSince, contacts) {
  SmsAndroid.list('{box:"inbox"}', (fail) => {
    Alert.alert(
      'Error',
      'An error occurated when reading SMS.',
      [{text: 'OK'}],
      { cancelable: false }
    );
  }, (count, smsList) => {
      var d = (!lastUpdate) ? ((new Date()).getTime() - checkSince * 60 * 1000): lastUpdate;
      var arr = JSON.parse(smsList).filter(obj => obj.date > d);
      var coords = [];
      arr.forEach((sms)=> {
        var obj = getLatLng(sms.body);
        if (obj !== false) {
          obj.date = sms.date;
          obj.number = sms.address;
          var contact = getContact(obj.number, contacts);
          if (contact !== false) {
            obj.contact = contact;
          }
          
          coords.push(obj);
        }
      });
  });
}

export default class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
        server: '',
        lastUpdate: false,
        checkSince: '5'
    }
    this._startListener = this._startListener.bind(this)
  }

  _startListener (event) {
    let server=this.state.server;
    let lastUpdate=this.state.lastUpdate;
    let checkSince=this.state.checkSince;
    PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS, PermissionsAndroid.PERMISSIONS.READ_CONTACTS
    ]).then( (data) => {
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
            if (isNaN(checkSince)) {
              Alert.alert(
                'Error',
                'The periode is not number.',
                [{text: 'OK'}],
                { cancelable: false }
              );
            } else if (isUrl(server)) {
              Alert.alert(
                'Info',
                'The app is now collecting coordinates.',
                [{text: 'OK'}],
                { cancelable: false }
              );
              
              checkSMS(server, lastUpdate, checkSince, contacts);
              this.state.lastUpdate = (new Date()).getTime();
            } else {
              Alert.alert(
                'Error',
                'The Address is not valid.',
                [{text: 'OK'}],
                { cancelable: false }
              );
            }
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
    });
  }

  render() {
    
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
                <Input onChangeText={(text) => this.state.server = text} />
              </Item>
              {(!this.state.lastUpdate) ? (
                <Item floatingLabel>
                  <Label>Periode to check in minutes</Label>
                  <Input value={this.state.checkSince} onChangeText={(text) => this.state.checkSince = text} />
                </Item>
            ): null}
              <Button style={{marginTop: 10 }}  onPress={this._startListener}>
                <Text>Check last SMS</Text>
              </Button>
            </Form>
            
          </Content>
        </Container>
      </StyleProvider>
    );
  }
}