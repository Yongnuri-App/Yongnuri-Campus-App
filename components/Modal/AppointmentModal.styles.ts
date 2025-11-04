// components/Appointment/AppointmentModal.styles.ts
import { Dimensions, PixelRatio, StyleSheet } from 'react-native';

/**
 * 반응형 스케일 유틸
 * - 기준 폭 375pt / 기준 높이 812pt
 * - 너무 작거나 큰 값은 살짝 완충(min/max)으로 디자인 붕괴 방지
 */
const { width: W, height: H } = Dimensions.get('window');
const BW = 375;   // base width
const BH = 812;   // base height
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const s  = (px: number) => clamp((W / BW) * px, px * 0.9, px * 1.15);   // width scale
const vs = (px: number) => clamp((H / BH) * px, px * 0.9, px * 1.15);   // height scale
const font = (px: number) => px * PixelRatio.getFontScale();            // 폰트는 시스템 스케일 존중

// 피그마 카드 기준(344 x 539)을 스케일 적용
const CARD_W  = clamp((W - s(32)), s(320), s(360)); // 좌우 16 여백 보장, 과도확대 방지
const CARD_MIN_H = vs(539);

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
    paddingHorizontal: s(16),
  },

  /** 카드 본체 */
  card: {
    width: CARD_W,
    minHeight: CARD_MIN_H,
    backgroundColor: '#FFFFFF',
    borderRadius: s(10),
    paddingTop: vs(20),
    paddingBottom: vs(16),
    paddingHorizontal: s(20),
  },

  /** 닫기 버튼 (우상단) */
  closeBtn: {
    position: 'absolute',
    right: s(12),
    top: vs(12),
    padding: s(6),
  },
  closeIcon: {
    width: s(24),
    height: s(24),
  },

  /** "닉네임님과의 약속" */
  titleText: {
    marginTop: vs(45),
    fontSize: font(20),
    lineHeight: vs(22),
    color: '#000000',
    fontWeight: '700',
  },

  /** 폼 영역 컨테이너 */
  formGroup: {
    marginTop: vs(24),
  },

  /** 행: 좌측 라벨, 우측 값/셀렉터 */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /** 라벨 (날짜/시간/장소) */
  label: {
    width: s(48), // 피그마 기준 라벨 좌측 정렬 폭 확보
    fontSize: font(16),
    lineHeight: vs(20),
    fontWeight: '600',
    color: '#1E1E1E',
  },

  /** 우측 값 영역(누르면 드롭다운 열림) */
  valueRowRight: {
    flex: 1,
    minHeight: vs(24),
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  /** 값 텍스트 */
  valueText: {
    fontSize: font(15),
    lineHeight: vs(20),
    fontWeight: '500',
    color: '#393A40',
    marginRight: s(6),
    textAlign: 'right',
  },
  /** 플레이스홀더 색상 */
  placeholderText: {
    color: '#979797',
  },

  /** 드롭다운 아이콘(chevron) */
  chevron: {
    width: s(24),
    height: s(24),
  },

  /** 임시 드롭다운 박스 */
  dropdown: {
    marginTop: vs(8),
    marginLeft: s(48), // 라벨 폭만큼 들여쓰기
    backgroundColor: '#FFFFFF',
    borderRadius: s(8),
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: s(8),
    shadowOffset: { width: 0, height: vs(2) },
  },
  dropdownItem: {
    paddingVertical: vs(10),
    paddingHorizontal: s(12),
  },
  dropdownItemPressed: {
    backgroundColor: '#F5F7FA',
  },
  dropdownItemText: {
    fontSize: font(13),
    color: '#1E1E1E',
  },

  /** 작성완료 버튼 */
  submitBtn: {
    position: 'absolute',
    bottom: vs(20),          // 카드 하단에서 여백
    left: s(20),
    right: s(20),
    height: vs(50),
    borderRadius: s(50),
    backgroundColor: '#395884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: font(16),
    lineHeight: vs(22),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
