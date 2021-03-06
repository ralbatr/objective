/**
 * Created by Layman(http://github.com/anysome) on 16/11/24.
 */

import React from 'react';
import {StyleSheet, ListView, RefreshControl, View, Text,
  TouchableOpacity, Image, InteractionManager} from 'react-native';

import SwipeableListViewDataSource from 'SwipeableListViewDataSource';
import SwipeableListView from 'SwipeableListView';
import SwipeableQuickActions from 'SwipeableQuickActions';
import SwipeableQuickActionButton from 'SwipeableQuickActionButton';
import TouchableBounce from 'TouchableBounce';

import {analytics, styles, colors, px1, airloy, api, toast, L, hang} from '../../app';
import util from '../../libs/Util';
import ListSource from '../../logic/ListSource';
import ActionSheet from '@yfuks/react-native-action-sheet';
import EventTypes from '../../logic/EventTypes';

import EditTask from './EditTask';

export default class Project extends React.Component {

  constructor(props) {
    super(props);
    this.listSource = new ListSource();
    this.project = props.data;
    this.today = props.today;
    this.state = {
      isRefreshing: true,
      dataSource: new SwipeableListViewDataSource({
        getSectionHeaderData: (dataBlob, sectionId) => this.project,
        rowHasChanged: (row1, row2) => row1 !== row2,
        sectionHeaderHasChanged: (s1, s2) => s1 !== s2
      })
    };
  }

  componentWillMount() {
    let route = this.props.navigator.navigationContext.currentRoute;
    route.onRightButtonPress = () => {
      this.props.navigator.push({
        title: '添加子任务',
        component: EditTask,
        passProps: {
          projectId: this.project.id,
          editable: true,
          onUpdated: (rowData) => this.updateRow(rowData, true)
        }
      });
    };
    // so many bugs on android T_T
    util.isAndroid() ?
      this.props.navigator.replaceAtIndex(route, -1) : this.props.navigator.replace(route);
    airloy.event.on(EventTypes.taskChange, ()=> {
      this.reload();
    });
  }

  componentDidMount() {
    analytics.onPageStart('page_project');
    util.isAndroid() ? InteractionManager.runAfterInteractions(() => this.reload()) : this.reload();
  }

  componentWillUnmount() {
    airloy.event.off(EventTypes.taskChange);
    analytics.onPageEnd('page_project');
  }

  async reload() {
    this.setState({
      isRefreshing: true
    });
    let result = await airloy.net.httpGet(api.task.list, {projectId: this.project.id});
    if (result.success) {
      this.listSource = new ListSource(result.info);
      this.setState({
        dataSource: this.state.dataSource.cloneWithRowsAndSections({s1:this.listSource.datas}, ['s1'], null),
        isRefreshing: false
      });
    } else {
      result.message !== 'error.request.auth' && this.setState({
        isRefreshing: false
      });
      toast(L(result.message));
    }
  }

  _toArrange(rowData) {
    let BUTTONS = ['安排到今天', '安排到明天', '安排到后天', '取消'];
    let CANCEL_INDEX = 3;
    ActionSheet.showActionSheetWithOptions({
        options: BUTTONS,
        cancelButtonIndex: CANCEL_INDEX,
        tintColor: colors.dark2
      },
      async (buttonIndex) => {
        if (buttonIndex !== CANCEL_INDEX) {
          hang();
          let newDate = new Date(this.today + 86400000 * buttonIndex);
          let result = await airloy.net.httpGet(api.task.arrange, {
              id: rowData.id,
              date: newDate
            }
          );
          if (result.success) {
            airloy.event.emit(EventTypes.agendaAdd, result.info);
            rowData.arranged = true;
            this.state.dataSource.setOpenRowID(null);
            this.listSource.update(util.clone(rowData));
            this.setState({
              dataSource: this.state.dataSource.cloneWithRowsAndSections({s1:this.listSource.datas}, ['s1'], null)
            });
            toast('已安排到待办列表中');
          } else {
            toast(L(result.message));
          }
          hang(false);
        }
      }
    );
  }

  _moreActions(rowData) {
    let BUTTONS = ['删除', '取消'];
    ActionSheet.showActionSheetWithOptions({
        options: BUTTONS,
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
        tintColor: colors.dark2
      },
      async(buttonIndex) => {
        switch (buttonIndex) {
          case 0:
            this._toDelete(rowData);
            break;
          default:
            console.log('cancel options');
        }
      }
    );
  }

  async _toDelete(rowData) {
    hang();
    let result = await airloy.net.httpGet(api.task.remove, {id: rowData.id});
    hang(false);
    if (result.success) {
      this.deleteRow(rowData);
      airloy.event.emit(EventTypes.choreChange);
    } else {
      toast(L(result.message));
    }
  }

  updateRow(rowData, isNew) {
    this.listSource.update(rowData);
    isNew && this.project.subTodo++ && this.project.subTotal++;
    this.setState({
      dataSource: this.state.dataSource.cloneWithRowsAndSections({s1:this.listSource.datas}, ['s1'], null)
    });
  }

  deleteRow(rowData) {
    this.listSource.remove(rowData);
    this.setState({
      dataSource: this.state.dataSource.cloneWithRowsAndSections({s1:this.listSource.datas}, ['s1'], null)
    });
    this.project.subTotal--;
    rowData.status === '0' && this.project.subTodo--;
  }

  _pressRow(rowData, editable) {
    this.props.navigator.push({
      title: editable ? '修改子任务' : '查看子任务',
      component: EditTask,
      passProps: {
        data: rowData,
        editable: editable,
        onUpdated: (rowData) => this.updateRow(rowData)
      }
    });
  }

  _renderRow(rowData, sectionId, rowId) {
    let transform, editable = true;
    if (rowData.status === '1') {
      transform = {
        titleColor: colors.border,
        detailColor: colors.border
      };
      editable = false;
    } else if (rowData.arranged) {
      transform = {
        titleColor: colors.dark2,
        detailColor: colors.border
      };
    } else {
      transform = {
        titleColor: colors.dark1,
        detailColor: colors.dark2
      };
    }
    return (
      <TouchableBounce style={styles.listRow} onPress={() => this._pressRow(rowData, editable)}>
        {rowData.status === '1' &&
        <Image source={require('../../../resources/icons/checked.png')} style={style.icon} />
        }
        <View style={styles.flex}>
          <Text style={[styles.title, {color: transform.titleColor}]}>{rowData.title}</Text>
          {rowData.detail ? <Text style={[styles.text, {color: transform.detailColor}]}>{rowData.detail}</Text> : null}
        </View>
      </TouchableBounce>
    );
  }

  _renderSeparator(sectionId, rowId, adjacentRowHighlighted) {
    return <View key={rowId + '_separator'} style={styles.hr}></View>
  }

  _renderSectionHeader(sectionData, sectionId) {
    return sectionData.detail ? (
      <View style={style.header}>
        <Text style={styles.text}>{sectionData.detail}</Text>
      </View>)
      : null;
  }

  _renderActions(rowData, sectionId) {
    return (
      <SwipeableQuickActions style={styles.rowActions}>
        <SwipeableQuickActionButton imageSource={{}} text={"更多"}
                                    onPress={() => this._moreActions(rowData)}
                                    style={styles.rowAction} textStyle={styles.rowText}/>
        { rowData.status === '0' && !rowData.arranged &&
        <SwipeableQuickActionButton imageSource={{}} text={"安排"}
                                    onPress={() => this._toArrange(rowData, sectionId)}
                                    style={styles.rowActionConstructive} textStyle={styles.rowText}/>
        }
      </SwipeableQuickActions>
    );
  }

  render() {
    return (
      <SwipeableListView
        maxSwipeDistance={120}
        renderQuickActions={(rowData, sectionId, rowId) => this._renderActions(rowData, sectionId)}
        enableEmptySections={true}
        initialListSize={10}
        pageSize={5}
        dataSource={this.state.dataSource}
        renderRow={(rowData, sectionId, rowId) => this._renderRow(rowData, sectionId, rowId)}
        renderSeparator={this._renderSeparator}
        renderSectionHeader={this._renderSectionHeader}
        refreshControl={<RefreshControl
                            refreshing={this.state.isRefreshing}
                            onRefresh={() => this.reload()}
                            tintColor={colors.accent}
                            title={'加载中...'}
                            colors={[colors.accent, colors.action]}
                            progressBackgroundColor={colors.bright1}
                         />}
      />
    );
  }
}


const style = StyleSheet.create({
  icon: {
    tintColor: colors.bright2,
    marginRight: 4
  },
  header: {
    paddingTop: 16,
    paddingLeft: 24,
    paddingRight: 16,
    paddingBottom: 8,
    borderBottomWidth: px1,
    borderBottomColor: colors.bright2,
    backgroundColor: colors.bright1
  }
});
