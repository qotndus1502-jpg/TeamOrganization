import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { getSession } from "@/lib/auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const extractionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    basic_information: {
      type: SchemaType.OBJECT,
      properties: {
        employee_number: { type: SchemaType.STRING, description: "사번" },
        name_kor: { type: SchemaType.STRING, description: "성명(한글)" },
        position: { type: SchemaType.STRING, description: "직위" },
        duty: { type: SchemaType.STRING, description: "직책(예: 팀원)" },
        department: { type: SchemaType.STRING, description: "소속 부서" },
        job_category: { type: SchemaType.STRING, description: "직종(예: 건축)" },
        job_role: { type: SchemaType.STRING, description: "직무(예: 공사관리)" },
        employment_type: { type: SchemaType.STRING, description: "직원구분(예: 일반직)" },
        birth_date: { type: SchemaType.STRING, description: "생년월일" },
        address: { type: SchemaType.STRING, description: "현주소" },
        phone_number: { type: SchemaType.STRING, description: "전화번호" },
        entry_date: { type: SchemaType.STRING, description: "회사입사일" },
        entry_type: { type: SchemaType.STRING, description: "입사경위" },
        specialty: { type: SchemaType.STRING, description: "특기" },
        hobby: { type: SchemaType.STRING, description: "취미" },
        disability_status: { type: SchemaType.STRING, description: "장애여부" },
        veteran_status: { type: SchemaType.STRING, description: "보훈여부" },
      },
      required: ["name_kor"],
    },
    education: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          period: { type: SchemaType.STRING, description: "기간(시작~종료)" },
          school_name: { type: SchemaType.STRING, description: "학교명" },
          major: { type: SchemaType.STRING, description: "전공" },
          degree: { type: SchemaType.STRING, description: "학위" },
          location: { type: SchemaType.STRING, description: "소재지" },
        },
        required: ["school_name"],
      },
      description: "학력사항",
    },
    certifications: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: "자격면허명" },
          acquisition_date: { type: SchemaType.STRING, description: "취득일" },
          issuer: { type: SchemaType.STRING, description: "기관명" },
          license_number: { type: SchemaType.STRING, description: "면허번호" },
        },
        required: ["name"],
      },
      description: "자격증/면허 목록",
    },
    experience: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          period: { type: SchemaType.STRING, description: "기간" },
          company: { type: SchemaType.STRING, description: "회사명" },
          position: { type: SchemaType.STRING, description: "최종직위" },
          task: { type: SchemaType.STRING, description: "담당업무" },
        },
        required: ["company"],
      },
      description: "경력사항",
    },
    family_relations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          relation: { type: SchemaType.STRING, description: "관계" },
          name: { type: SchemaType.STRING, description: "성명" },
          birth_date: { type: SchemaType.STRING, description: "생년월일" },
          occupation: { type: SchemaType.STRING, description: "직업" },
        },
        required: ["relation"],
      },
      description: "가족관계",
    },
    appointment_history: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          date: { type: SchemaType.STRING, description: "발령일자" },
          type: { type: SchemaType.STRING, description: "발령구분" },
          position: { type: SchemaType.STRING, description: "직위" },
          grade: { type: SchemaType.STRING, description: "급호(예: 01호)" },
          department: { type: SchemaType.STRING, description: "소속부서" },
          duty: { type: SchemaType.STRING, description: "직책" },
          job_role: { type: SchemaType.STRING, description: "직무" },
        },
        required: ["date"],
      },
      description: "발령사항",
    },
  },
  required: ["basic_information"],
};

const SYSTEM_PROMPT = `당신은 기업의 인사부서에서 근무하는 "인사 데이터 분석 전문가"입니다.
업로드된 이력서(또는 인사기록카드) 이미지/PDF 파일에서 정보를 추출하여, 정의된 JSON 형식으로 구조화된 데이터를 생성해 주세요.

<추출 지침 (Instructions)>
1. 데이터 매핑: 문서에 명시된 필드명을 기반으로 JSON 구조의 각 키(Key)에 맞는 값을 찾아 입력하세요.
2. 날짜 형식: 모든 날짜는 YYYY.MM.DD 또는 YYYY-MM-DD 형식을 유지하세요.
3. 누락 데이터 처리: 문서에서 찾을 수 없는 정보는 빈 문자열("") 또는 null로 표시하세요.
4. 표 데이터: 학력, 자격증, 경력 사항처럼 표로 정리된 내용은 반드시 배열(Array) 형태로 모든 항목을 포함해야 합니다.
5. 언어: 한글로 작성된 내용은 한글 그대로 유지하되, Key값만 영문으로 출력하세요.`;

export async function POST(request: NextRequest) {
  try {
    // [보안] 인증 확인
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "PDF 파일만 업로드 가능합니다." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 });
    }

    // PDF를 base64로 변환
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // [보안] PDF 매직넘버 검증
    const buffer = Buffer.from(bytes);
    if (buffer.length < 5 || buffer.toString("utf-8", 0, 5) !== "%PDF-") {
      return NextResponse.json({ error: "유효한 PDF 파일이 아닙니다." }, { status: 400 });
    }

    // Gemini Flash 호출
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64,
        },
      },
      { text: SYSTEM_PROMPT },
    ]);

    const text = result.response.text();
    const extracted = JSON.parse(text);

    return NextResponse.json(extracted);
  } catch (e) {
    console.error("PDF extraction error:", e);
    return NextResponse.json(
      { error: "PDF 분석 중 오류가 발생했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
