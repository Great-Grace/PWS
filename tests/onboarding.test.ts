import * as assert from 'node:assert/strict';
import {
  areAllAgreementsAccepted,
  areRequiredAgreementsAccepted,
  canContinueProfile,
  normalizeBirthYear,
  setAllAgreements,
  toggleAgreement,
} from '../src/utils/onboarding';

const emptyState = { terms: false, privacy: false, marketing: false };

assert.deepEqual(
  setAllAgreements(true),
  { terms: true, privacy: true, marketing: true },
  '전체 동의는 모든 약관을 true 로 설정해야 한다'
);

assert.deepEqual(
  toggleAgreement(emptyState, 'terms'),
  { terms: true, privacy: false, marketing: false },
  '개별 약관 토글은 해당 약관만 반전해야 한다'
);

assert.equal(
  areRequiredAgreementsAccepted({ terms: true, privacy: true, marketing: false }),
  true,
  '필수 약관 둘 다 체크되면 다음 단계로 진행 가능해야 한다'
);

assert.equal(
  areAllAgreementsAccepted({ terms: true, privacy: true, marketing: false }),
  false,
  '선택 약관이 빠지면 전체 동의 상태는 false 여야 한다'
);

assert.equal(
  normalizeBirthYear('1999-02-14'),
  1999,
  '생년월일 문자열에서는 앞 4자리 연도를 추출해야 한다'
);

assert.equal(
  normalizeBirthYear('19990214'),
  1999,
  '구분자 없는 YYYYMMDD 형식도 유효한 날짜면 허용해야 한다'
);

assert.equal(
  normalizeBirthYear('1999'),
  1999,
  '연도만 입력한 합리적인 값은 허용해야 한다'
);

assert.equal(
  normalizeBirthYear('89'),
  undefined,
  '연도가 불완전하면 undefined 여야 한다'
);

assert.equal(
  normalizeBirthYear('abc1999'),
  undefined,
  '연도가 앞에 없는 임의 문자열은 undefined 여야 한다'
);

assert.equal(
  normalizeBirthYear('1999-02'),
  undefined,
  '불완전한 날짜 형식은 undefined 여야 한다'
);

assert.equal(
  normalizeBirthYear('1999-02-30'),
  undefined,
  '존재하지 않는 날짜는 undefined 여야 한다'
);

const nextYear = new Date().getFullYear() + 1;
assert.equal(
  normalizeBirthYear(`${nextYear}`),
  undefined,
  '미래 연도는 undefined 여야 한다'
);

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const futureDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
assert.equal(
  normalizeBirthYear(futureDate),
  undefined,
  '미래 날짜는 undefined 여야 한다'
);

assert.equal(
  canContinueProfile({
    name: '홍길동',
    birthDate: '1999-02-14',
    gender: 'M',
    heightCm: '',
    weightKg: '',
    province: '서울특별시',
    district: '강남구',
  }),
  true,
  '필수 프로필과 지역이 채워지면 완료 버튼이 활성화되어야 한다'
);

assert.equal(
  canContinueProfile({
    name: '',
    birthDate: '1999-02-14',
    gender: 'M',
    heightCm: '',
    weightKg: '',
    province: '서울특별시',
    district: '강남구',
  }),
  false,
  '이름이 비어 있으면 완료 버튼이 비활성화되어야 한다'
);

console.log('onboarding test passed');
