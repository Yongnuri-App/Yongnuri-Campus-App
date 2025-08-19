import React, { useState } from 'react';
import { FlatList, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import styles from './SearchPage.styles';

const recentKeywords = ["더워", "장마", "중고책", "자전거", "노트북", "여름옷"];

export default function SearchPage({ navigation }: any) {
  const [keyword, setKeyword] = useState('');

  // 검색어 삭제 핸들러
  const clearKeywords = () => {
    // TODO: 서버와 연결 시 최근 검색어 삭제 API 호출
    console.log("전체 삭제");
  };

  return (
    <View style={styles.container}>
      {/* 상단 검색바 영역 */}
      <View style={styles.searchBar}>
        {/* 뒤로가기 버튼 */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../../assets/images/back.png')}
            style={styles.iconBack}
            resizeMode="contain" />
        </TouchableOpacity>

        {/* 검색 입력창 */}
        <TextInput
          style={styles.input}
          placeholder="검색어를 입력해주세요."
          value={keyword}
          onChangeText={setKeyword}
        />

        {/* 검색 버튼 */}
        <TouchableOpacity>
          <Image source={require('../../assets/images/search.png')} style={styles.iconSearch} />
        </TouchableOpacity>
      </View>

      {/* 최근 검색어 헤더 */}
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>최근 검색어</Text>
        <TouchableOpacity onPress={clearKeywords}>
          <Text style={styles.deleteAll}>전체 삭제</Text>
        </TouchableOpacity>
      </View>

      {/* 최근 검색어 리스트 */}
      <FlatList
        data={recentKeywords}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.keywordRow}>
            <Image source={require('../../assets/images/time.png')} style={styles.iconTime} />
            <Text style={styles.keywordText}>{item}</Text>
            <TouchableOpacity>
              <Image source={require('../../assets/images/delete.png')} style={styles.iconDelete} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
