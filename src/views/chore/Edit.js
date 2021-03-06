/**
 * Created by Layman(http://github.com/anysome) on 16/3/17.
 */

import React from 'react';
import {StyleSheet, ScrollView, View, Text, TouchableOpacity, Alert} from 'react-native';
import Button from 'react-native-button';

import {analytics, styles, colors, airloy, api, L, toast, hang} from '../../app';
import util from '../../libs/Util';
import TextField from '../../widgets/TextField';
import TextArea from '../../widgets/TextArea';
import ActionSheet from '@yfuks/react-native-action-sheet';

export default class Edit extends React.Component {

  constructor(props) {
    super(props);
    this._title = null;
    this.data = props.data || {title: ''};
    this.projects = [];
    this.state = {
      title: this.data.title,
      detail: this.data.detail
    };
  }

  componentWillMount() {
  }

  async _save() {
    let result;
    this.data.detail = this.state.detail;
    if (this.data.id) {
      if (this._title.value.length > 0) {
        this.data.title = this.state.title;
      }
      hang();
      result = await airloy.net.httpPost(api.chore.update, this.data);
    } else {
      if (this._title.value.length < 1) {
        this._title.focus();
        return;
      }
      this.data.title = this.state.title;
      hang();
      result = await airloy.net.httpPost(api.chore.add, this.data);
    }
    hang(false);
    if (result.success) {
      this.props.navigator.pop();
      this.props.onUpdated(result.info);
    } else {
      toast(L(result.message));
    }
    analytics.onEvent('click_inbox_save');
  }

  render() {
    return (
      <ScrollView keyboardDismissMode='on-drag' keyboardShouldPersistTaps>
        <View style={styles.section}>
          <TextField
            ref={c => this._title = c}
            flat={true}
            defaultValue={this.state.title}
            onChangeText={(text) => this.setState({title:text})}
            placeholder={this.data.title || '先记下来...'}
            returnKeyType="done"
            autoFocus={this.data.title === ''}
          />
          <View style={styles.separator}/>
                    <TextArea
                      flat={true}
                      defaultValue={this.state.detail}
                      onChangeText={(text) => this.setState({detail:text})}
                      placeholder={this.data.detail || '如有备注...'}
                      returnKeyType="default"
                    />
        </View>
        <Button
          style={styles.buttonText}
          containerStyle={styles.buttonAction}
          activeOpacity={0.5}
          onPress={()=>this._save()}>
          保存
        </Button>
      </ScrollView>
    );
  }
}
