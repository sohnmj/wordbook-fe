// 백엔드 INVALID_INPUT 메시지는 "필드: 사유" 형식이고 여러 개면 ", "로 이어진다.
// 예) "keyword: 단어를 입력해 주세요., lang: 언어를 선택해 주세요."
//  → "단어를 입력해 주세요. 언어를 선택해 주세요."
export const stripFieldPrefix = (message: unknown): string => {
  if (typeof message !== "string") return "";
  return message.replace(/(?:^|,\s*)[A-Za-z][\w.[\]]*:\s*/g, " ").trim();
};
