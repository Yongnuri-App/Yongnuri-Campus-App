import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styles from './CategoryChips.styles';

/** 칩 항목 타입: id(내부값), label(표시 텍스트) */
export type CategoryItem = {
  id: string;
  label: string;
};

/**
 * 기본 카테고리 리스트
 * - 방법 A: 서버가 기대하는 location 문자열을 id와 label에 동일하게 설정
 * - "전체"만 예외로 id는 'all' 유지 (기존 로직과 호환)
 */
export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'all', label: '전체' },
  { id: '용인대 정문', label: '용인대 정문' },
  { id: '무도대학', label: '무도대학' },
  { id: '체육과학대학', label: '체육과학대학' },
  { id: 'AI바이오융합대학', label: 'AI바이오융합대학' },
  { id: '문화예술대학', label: '문화예술대학' },
  { id: '인성관', label: '인성관' },
  { id: '학생회관', label: '학생회관' },
  { id: '중앙도서관', label: '중앙도서관' },
  { id: '용오름대학', label: '용오름대학' },
];

type Props = {
  /** 현재 선택된 카테고리 id (외부에서 상태 관리) */
  value: string;
  /** 카테고리를 탭했을 때 상위로 선택값 전달 */
  onChange: (nextId: string) => void;
  /** 표시할 항목 (미지정 시 DEFAULT_CATEGORIES 사용) */
  items?: CategoryItem[];
  /** 바깥 여백 등을 페이지에서 커스터마이즈하고 싶을 때 */
  containerStyle?: any;
};

/**
 * 필터 칩(세그먼트) 그룹 컴포넌트
 * - 항목이 많아지면 가로 스크롤 가능
 */
export default function CategoryChips({
  value,
  onChange,
  items = DEFAULT_CATEGORIES,
  containerStyle,
}: Props) {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* 가로 스크롤: 칩이 화면 폭을 넘어가면 자연스럽게 스크롤 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {items.map((it) => {
          const active = value === it.id;
          return (
            <TouchableOpacity
              key={it.id}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              onPress={() => onChange(it.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${it.label} 선택`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                {it.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
