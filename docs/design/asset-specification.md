# PWS Weather Avatar Asset Specification

> Gemini或其他AI画像生成ツール用のアセット仕様書
> 이 문서를 Gemini에 그대로 붙여넣기해서 에셋 생성

---

## 전제 조건 (반드시 지킬 것)

```
1. 스타일: 귀엽고 친근한 일러스트 (네모/둥근 형태, 큰 눈, 단순한 선)
2. 배경: 투명 (PNG)
3. 크기: 512×512px
4. 캐릭터: 성별 중립, 나이 불명, 머리카락 없거나 짧은 단순형
5. 색감: 파스텔 톤, 부드러운 그라디언트
6. 일관성: 모든 에셋이 "같은 캐릭터"여야 함
```

---

## Part 1: 하늘 배경 (Sky Backgrounds)

> 하늘만 있는 배경. 캐릭터 없음. 시간대+날씨 조합.

### 파일명 규칙
```
sky_{time}_{weather}.png
```

### 1-1. 맑은 하늘 (clear)

| 파일명 | 시간 | 설명 |
|--------|------|------|
| `sky_dawn_clear.png` | 새벽 05-07 | 보라→주황 그라디언트, 수평선에 태양 반 |
| `sky_morning_clear.png` | 아침 07-10 | 밝은 하늘색, 태양 광선 약간 |
| `sky_midday_clear.png` | 한낮 10-14 | 선명한 파란색, 태양 중앙 |
| `sky_afternoon_clear.png` | 오후 14-17 | 따뜻한 하늘색 |
| `sky_sunset_clear.png` | 노을 17-19 | 주황→보라 그라디언트, 태양 반쯤 |
| `sky_dusk_clear.png` | 황혼 19-21 | 진한 보라, 별 몇 개 |
| `sky_night_clear.png` | 밤 21-05 | 남색~검정, 달+별 |

### 1-2. 흐린 하늘 (cloudy)

| 파일명 | 설명 |
|--------|------|
| `sky_morning_cloudy.png` | 아침 + 구름 (밝은 회색 구름) |
| `sky_midday_cloudy.png` | 한낮 + 구름 |
| `sky_afternoon_cloudy.png` | 오후 + 구름 |
| `sky_sunset_cloudy.png` | 노을 + 구름 (구름 사이로 주황빛) |
| `sky_night_cloudy.png` | 밤 + 구름 |

### 1-3. 비 오는 하늘 (rainy)

| 파일명 | 설명 |
|--------|------|
| `sky_morning_rainy.png` | 아침 + 어두운 회색 + 비 구름 |
| `sky_midday_rainy.png` | 한낮 + 회색 하늘 |
| `sky_afternoon_rainy.png` | 오후 + 비 구름 |
| `sky_night_rainy.png` | 밤 + 비 + 어두운 하늘 |

### 1-4. 눈 오는 하늘 (snowy)

| 파일명 | 설명 |
|--------|------|
| `sky_morning_snowy.png` | 아침 + 하얀 구름 + 밝은 분위기 |
| `sky_midday_snowy.png` | 한낮 + 하얀 하늘 |
| `sky_night_snowy.png` | 밤 + 눈 + 남색 하늘 |

**하늘 합계: ~19장**

---

## Part 2: 아바타 기본 포즈 (Base Poses)

> 캐릭터의 몸짓. 얼굴 표정은 별도 레이어.

### 파일명 규칙
```
avatar_pose_{pose}.png
```

### 포즈 목록

| 파일명 | 포즈 | 설명 |
|--------|------|------|
| `avatar_pose_standing.png` | 기본 서기 | 편하게 서있는 자세, 팔 자연스럽게 |
| `avatar_pose_shivering.png` | 추위에 떨기 | 팔짱끼고 몸을 웅크리며 떨고 있는 자세 |
| `avatar_pose_hugging.png` | 따뜻하게 껴안기 | 양팔로 자기 몸을 꼭 껴안는 자세 |
| `avatar_pose_fanning.png` | 더위에 부채질 | 한 손으로 부채질하는 자세 |
| `avatar_pose_wiping.png` | 땀 닦기 | 이마에 손을 대고 땀을 닦는 자세 |
| `avatar_pose_shield_rain.png` | 비 피하기 | 머리 위에 손을 올리고 비를 피하는 자세 |
| `avatar_pose_umbrella.png` | 우산 쓰기 | 우산을 든 자세 (우산은 별도 에셋) |
| `avatar_pose_snowflake.png` | 눈 맞기 | 고개를 들고 눈을 맞는 자세, 팔 벌림 |
| `avatar_pose_walking.png` | 걸어가기 | 활기차게 걸어가는 자세 |
| `avatar_pose_sleepy.png` | 졸린 자세 | 하품하듯 입 벌리고 눈 감은 자세 |
| `avatar_pose_cheerful.png` | 기분 좋음 | 팔을 들고 활짝 웃는 자세 |
| `avatar_pose_arms_crossed.png` | 팔짱 | 팔짱끼고 서있는 자세 (쌀쌀할 때) |

**포즈 합계: 12장**

---

## Part 3: 아바타 얼굴 표정 (Face Expressions)

> 머리 부분만. 포즈와 조합해서 사용.

### 파일명 규칙
```
avatar_face_{emotion}.png
```

### 표정 목록

| 파일명 | 표정 | 설명 |
|--------|------|------|
| `avatar_face_neutral.png` | 평범 | 입 다물고 눈 뜬 상태 |
| `avatar_face_smile.png` | 미소 | 입 올라가고 눈 살짝 감김 |
| `avatar_face_cold_pain.png` | 추위 고통 | 눈 꼭 감고 입 오므리며 이 떨리는 느낌 |
| `avatar_face_hot_pain.png` | 더위 고통 | 입 벌리고 혀 내밀며 땀방울 |
| `avatar_face_sweating.png` | 땀흘림 | 이마에 땀방울, 찡그린 표정 |
| `avatar_face_shiver.png` | 떨기 | 입 떨리고 눈 동그랗게 |
| `avatar_face_yawn.png` | 하품 | 입 크게 벌리고 눈 감음 |
| `avatar_face_surprised.png` | 놀람 | 눈 동그랗게 입 동그랗게 (비/눈 갑자기 올 때) |
| `avatar_face_comfortable.png` | 쾌적 | 편안한 미소, 눈 반쯤 감김 |
| `avatar_face_worried.png` | 걱정 | 눈썹 올리고 입 다물기 (뇌우 등) |

**표정 합계: 10장**

---

## Part 4: 옷차림 (Clothing Outfits)

> 캐릭터 위에 덮어쓰는 옷 레이어. 투명 배경.

### 파일명 규칙
```
avatar_outfit_{outfit}.png
```

### 옷차림 목록

| 파일명 | 옷차림 | 설명 | 기온대 |
|--------|--------|------|--------|
| `avatar_outfit_summer_light.png` | 여름 가벼운 옷 | 반팔 티 + 반바지 | >28°C |
| `avatar_outfit_summer_casual.png` | 여름 캐주얼 | 민소매 + 반바지 | >30°C |
| `avatar_outfit_spring_light.png` | 봄 가벼운 | 얇은 셔츠 + 면바지 | 18-25°C |
| `avatar_outfit_spring_cardigan.png` | 봄 가디건 | 셔츠 + 가디건 + 긴바지 | 13-18°C |
| `avatar_outfit_fall_jacket.png` | 가을 자켓 | 긴팔 + 자켓 + 긴바지 | 8-13°C |
| `avatar_outfit_fall_coat.png` | 가을 코트 | 니트 + 코트 + 긴바지 | 3-8°C |
| `avatar_outfit_winter_coat.png` | 겨울 코트 | 두꺼운 니트 + 코트 + 목도리 | -5~3°C |
| `avatar_outfit_winter_padding.png` | 겨울 패딩 | 패딩 + 목도리 + 장갑 | <-5°C |

**옷차림 합계: 8장**

---

## Part 5: 날씨 효과 소품 (Weather Props)

> 캐릭터 주변에 추가하는 소품/효과

### 파일명 규칙
```
prop_{item}.png
```

### 소품 목록

| 파일명 | 소품 | 설명 |
|--------|------|------|
| `prop_umbrella_open.png` | 펼친 우산 | 비 올 때 캐릭터 위에 |
| `prop_rain_drops.png` | 비 방울 | 캐릭터 주변에 흩뿌리는 비 |
| `prop_snowflakes.png` | 눈송이 | 캐릭터 주변에 내리는 눈 |
| `prop_sweat_drops.png` | 땀방울 | 캐릭터 머리 옆에 땀 |
| `prop_breath_cloud.png` | 입김 | 추울 때 입에서 나오는 하얀 김 |
| `prop_sun_glow.png` | 태양 빛남 | 맑은 날 캐릭터 뒤에 빛 효과 |
| `prop_thunder_bolt.png` | 번개 | 뇌우 시 캐릭터 뒤에 |
| `prop_fog_mist.png` | 안개 | 캐릭터 발 아래에 안개 |
| `prop_wind_lines.png` | 바람 선 | 캐릭터 옆에 바람 표현 |
| `prop_leaf.png` | 낙엽 | 가을 바람에 날리는 잎사귀 |

**소품 합계: 10장**

---

## Part 6: 조합 매트릭스 (어떤 상황에 어떤 에셋을 조합하는지)

### 추위 (기온 < 5°C)

```
하늘: sky_{time}_clear 또는 sky_{time}_cloudy
포즈: avatar_pose_shivering 또는 avatar_pose_hugging
표정: avatar_face_cold_pain 또는 avatar_face_shiver
옷차림: avatar_outfit_winter_*
소품: prop_breath_cloud + prop_wind_lines (선택)
```

### 선선 (기온 5~15°C)

```
하늘: sky_{time}_clear 또는 sky_{time}_cloudy
포즈: avatar_pose_arms_crossed 또는 avatar_pose_standing
표정: avatar_face_comfortable 또는 avatar_face_neutral
옷차림: avatar_outfit_fall_*
소품: prop_leaf (가을이면 선택)
```

### 쾌적 (기온 15~25°C)

```
하늘: sky_{time}_clear
포즈: avatar_pose_standing 또는 avatar_pose_cheerful
표정: avatar_face_smile 또는 avatar_face_comfortable
옷차림: avatar_outfit_spring_*
소품: 없음
```

### 더위 (기온 25~32°C)

```
하늘: sky_{time}_clear
포즈: avatar_pose_fanning 또는 avatar_pose_wiping
표정: avatar_face_sweating 또는 avatar_face_hot_pain
옷차림: avatar_outfit_summer_*
소품: prop_sweat_drops + prop_sun_glow
```

### 폭염 (기온 > 32°C)

```
하늘: sky_{time}_clear (강한 빛)
포즈: avatar_pose_wiping
표정: avatar_face_hot_pain
옷차림: avatar_outfit_summer_casual
소품: prop_sweat_drops + prop_sun_glow (강하게)
```

### 비

```
하늘: sky_{time}_rainy
포즈: avatar_pose_shield_rain 또는 avatar_pose_umbrella
표정: avatar_face_surprised 또는 avatar_face_worried
옷차림: 기온에 맞는 옷차림
소품: prop_umbrella_open + prop_rain_drops
```

### 눈

```
하늘: sky_{time}_snowy
포즈: avatar_pose_snowflake 또는 avatar_pose_shivering
표정: avatar_face_surprised 또는 avatar_face_smile (눈 좋아하면)
옷차림: avatar_outfit_winter_*
소품: prop_snowflakes + prop_breath_cloud
```

### 뇌우

```
하늘: sky_{time}_rainy (어둡게)
포즈: avatar_pose_shield_rain
표정: avatar_face_worried
옷차림: 기온에 맞는 옷차림
소품: prop_thunder_bolt + prop_rain_drops
```

---

## 파일 생성 순서 (우선순위)

```
1순위 (반드시): 하늘 7장 (맑은 하늘만)
   sky_dawn_clear, sky_morning_clear, sky_midday_clear,
   sky_afternoon_clear, sky_sunset_clear, sky_dusk_clear, sky_night_clear

2순위 (반드시): 아바타 포즈 6장 (핵심)
   standing, shivering, fanning, wiping, shield_rain, cheerful

3순위 (반드시): 표정 6장 (핵심)
   neutral, smile, cold_pain, hot_pain, sweating, comfortable

4순위 (권장): 옷차림 8장
   summer_light, summer_casual, spring_light, spring_cardigan,
   fall_jacket, fall_coat, winter_coat, winter_padding

5순위 (권장): 소품 6장
   umbrella_open, rain_drops, snowflakes, sweat_drops, breath_cloud, sun_glow

6순위 (선택): 하늘 변형 (흐림/비/눈)
   cloudy 5장, rainy 4장, snowy 3장

7순위 (선택): 추가 포즈/표정
   나머지 포즈 6장 + 표정 4장 + 소품 4장
```

**최소 에셋: 1순위+2순위+3순위 = 19장**
**권장 에셋: 1~5순위 = 39장**
**전체 에셋: 1~7순위 = ~59장**

---

## Gemini 프롬프트 템플릿

### 기본 스타일 접두사 (모든 생성에 사용)

```
Create a cute, friendly character illustration in a soft pastel art style.
The character should be gender-neutral with a round head, big eyes, simple lines.
Style: kawaii, minimal, flat illustration, soft shadows.
Background: transparent (PNG).
Size: 512x512 pixels.
```

### 하늘 생성 예시

```
[STYLE PREFIX above, minus character parts]

A dreamy sky illustration for a weather app background.
Time: morning (7-10am).
Weather: clear sky with gentle sun rays.
Colors: soft blue gradient from light to medium blue.
Style: pastel, soft, minimal clouds, no text.
Size: 1024x512 pixels, horizontal format.
```

### 아바타 포즈 생성 예시

```
[STYLE PREFIX above]

The character is standing with arms crossed, body slightly hunched,
looking cold. Simple flat illustration, no background.
The character should look cute and relatable.
Size: 512x512 pixels, transparent background.
```

### 표정 생성 예시

```
[STYLE PREFIX above]

Just the face and head of the character, showing a specific expression.
Expression: sweating from heat, mouth open, sweat drops on forehead.
Round head, big eyes, simple features.
Size: 256x256 pixels, transparent background.
```

---

## Notes

- All images must be consistent in style (same character, same art style)
- Use the same color palette across all assets
- Character proportions: head 40% of body, big eyes, small nose/mouth
- Avoid realistic proportions — keep it chibi/cute
- No text in any asset
- No UI elements (buttons, cards, etc.) — pure illustration only
