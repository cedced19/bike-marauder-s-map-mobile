import React from 'react';
import { PermissionsAndroid, Alert, AsyncStorage } from 'react-native';
import { Container, Header, Content, Button, Text, StyleProvider, Body, Title, Form, Input, Item, Label } from 'native-base';
import getTheme from './native-base-theme/components';
import material from './native-base-theme/variables/material';
import Contacts from 'react-native-contacts';
import SmsAndroid from 'react-native-sms-android';
import I18n from './app/i18n/i18n';

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
      I18n.t('error'),
      I18n.t('error_cannot_read_sms'),
      [{text: I18n.t('ok')}],
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
      if (!coords.length) {
        Alert.alert(
          I18n.t('info'),
          I18n.t('info_no_coords_in_sms_found'),
          [{text: I18n.t('ok')}],
          { cancelable: false }
        );
      } else {
        fetch(server + '/coords', {  
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(coords)
        })
        .then((response) => response.json())
        .then((responseJson) => {
          if (responseJson.status == 'ok') {
            Alert.alert(
              I18n.t('info'),
              I18n.t('info_coords_saved'),
              [{text: I18n.t('ok')}],
              { cancelable: false }
            );
          }
        })
        .catch((error) => {
          Alert.alert(
            I18n.t('error'),
            I18n.t('error_fail_when_uploding_coords'),
            [{text: I18n.t('ok')}],
            { cancelable: false }
          );
        });
      }
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
    this._startListener = this._startListener.bind(this);
  }

  _startListener () {
    let server = this.state.serverOld || this.state.server;
    this.state.serverOld = null;
    let lastUpdate=this.state.lastUpdate;
    let checkSince=this.state.checkSince;

    if (server == '') {
      AsyncStorage.getItem('server', (err, value) => {
        if (err || value == '' || value == null) {
          Alert.alert(
            I18n.t('error'),
            I18n.t('error_address_empty'),
            [{text: I18n.t('ok')}]
          );
        } else {
          Alert.alert(
            I18n.t('warning'),
            I18n.t('warning_take_previous_value_address') + ' ' + value,
            [
              {
                text: I18n.t('yes'), onPress: () => {
                  this.state.serverOld = value;
                  this._startListener();
                }
              },
              {text: I18n.t('cancel')}
            ]
          );
        }
      });
    } else if (isNaN(checkSince) && checkSince != '') {
      Alert.alert(
        I18n.t('error'),
        I18n.t('error_periode_is_not_number'),
        [{text: I18n.t('ok')}]
      );
     } else if (!isUrl(server)) {
      Alert.alert(
        I18n.t('error'),
        I18n.t('error_invalid_address'),
        [{text: I18n.t('ok')}]
      );
    } else {
      if (checkSince == '') checkSince = '5';
      AsyncStorage.setItem('server', server);
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_SMS, PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      ]).then((data) => {
        if (data['android.permission.READ_SMS'] !== 'granted') {
          Alert.alert(
            I18n.t('error'),
            I18n.t('error_no_access_to_SMS_received'),
            [{text: I18n.t('ok')}]
          );
        } else if (data['android.permission.READ_CONTACTS'] !== 'granted') {
          Alert.alert(
            I18n.t('error'),
            I18n.t('error_no_access_to_contacts_received'),
            [{text: I18n.t('ok')}]
          );
        } else {
          Contacts.getAll((err, contacts) => {
            if(err === 'denied'){
              Alert.alert(
                I18n.t('error'),
                I18n.t('error_reading_contacts'),
                [{text: I18n.t('ok')}]
              );
            } else {
                Alert.alert(
                  I18n.t('info'),
                  I18n.t('info_colecting_coordinates'),
                  [{text: I18n.t('ok')}]
                );
                checkSMS(server, lastUpdate, checkSince, contacts);
                this.state.lastUpdate = (new Date()).getTime();
            }
          })
        }
      }).catch(function () {
        Alert.alert(
          I18n.t('error'),
          'Cannot get permissions',
          [{text: I18n.t('ok')}]
        );
      });
    }
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
              {I18n.t('welcome_msg')}
            </Text>
            <Form>
              <Item stackedLabel>
                <Label>{I18n.t('server_address')}</Label>
                <Input onChangeText={(text) => this.state.server = text} />
              </Item>
              {(!this.state.lastUpdate) ? (
                <Item stackedLabel>
                  <Label>{I18n.t('periode_to_check')}</Label>
                  <Input onChangeText={(text) => this.state.checkSince = text} />
                </Item>
            ): null}
              <Button style={{marginTop: 10 }}  onPress={this._startListener}>
                <Text>{I18n.t('check_last_sms')}</Text>
              </Button>
            </Form>
            
          </Content>
        </Container>
      </StyleProvider>
    );
  }
}