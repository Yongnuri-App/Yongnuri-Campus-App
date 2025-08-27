// components/Appointment/AppointmentModal.styles.ts
import { Dimensions, StyleSheet } from 'react-native';

/**
 * 피그마 치수(344 x 539)를 기준으로 중앙 카드 크기/라운드/색상 매칭
 * - 작성완료 버튼: #395884, radius 50px
 * - 텍스트 톤: 제목 #000000, 라벨 #1E1E1E, 값/플레이스홀더 #979797
 */
const { width, height } = Dimensions.get('window');
const CARD_W = 344;
const CARD_H = 539;
const PRIMARY = '#395884';

export default StyleSheet.create({
  /** 반투명 배경 */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  /** 중앙 카드 래퍼 (정중앙 배치) */
  cardWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  /** 카드 본체 */
  card: {
    width: CARD_W,
    minHeight: CARD_H,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },

  /** 닫기 버튼 (우상단) */
  closeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 6,
  },
  closeIcon: {
    width: 24,
    height: 24,
  },

  /** "닉네임님과의 약속" */
  titleText: {
    marginTop: 45,
    fontSize: 20,
    lineHeight: 22,
    color: '#000000',
    fontWeight: '700',
  },

  /** 폼 영역 컨테이너 */
  formGroup: {
    marginTop: 24,
  },

  /** 행: 좌측 라벨, 우측 값/셀렉터 */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /** 라벨 (날짜/시간/장소) */
  label: {
    width: 48, // 피그마 기준 라벨 좌측 정렬 폭 확보
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1E1E1E',
  },

  /** 우측 값 영역(누르면 드롭다운 열림) */
  valueRowRight: {
    flex: 1,
    minHeight: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  /** 값 텍스트 */
  valueText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: '#393A40',
    marginRight: 6,
    textAlign: 'right',
  },
  /** 플레이스홀더 색상 */
  placeholderText: {
    color: '#979797',
  },

  /** 드롭다운 아이콘(chevron) */
  chevron: {
    width: 24,
    height: 24,
  },

  /** 임시 드롭다운 박스 */
  dropdown: {
    marginTop: 8,
    marginLeft: 48, // 라벨 폭만큼 들여쓰기
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownItemPressed: {
    backgroundColor: '#F5F7FA',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#1E1E1E',
  },

  /** 작성완료 버튼 */
  submitBtn: {
  position: 'absolute',
  bottom: 20,           // 카드 하단에서 20px 위
  left: 20,
  right: 20,
  height: 50,
  borderRadius: 50,
  backgroundColor: '#395884',
  alignItems: 'center',
  justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
