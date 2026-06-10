"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function DemoPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "실기 고사와 학업 성적(수능/내신)의 가장 이상적인 배분 비율은?",
      a: "목표 대학별로 상이하지만, 평균적으로 학기 중에는 [학업 60% : 실기 40%]의 비율을 유지하다가, 9월 원서 접수 이후부터 실기고사 직전까지는 [실기 70% : 학업 30%]로 몰입도를 전환하는 것이 상위권 대학 합격생들의 검증된 밸런스 템포입니다. 브레인팩토리 플래너는 이 템포를 개별 루틴으로 설정해 추적해 줍니다."
    },
    {
      q: "미술 실기실에서 뽀모도로(Pomodoro) 공부법을 어떻게 적용하나요?",
      a: "드로잉이나 아이디어 스케치 단계에서 50분 극도의 몰입 후 10분 휴식을 취하는 '50/10 룰'을 적용합니다. 특히 피드백 단계를 뽀모도로 마지막 세션에 배치하면 집중력이 무너지는 것을 방지하고 하루 드로잉 완수량을 1.8배 이상 끌어올릴 수 있습니다."
    },
    {
      q: "수능 최저 등급이 필요한 대학들의 캘린더 리마인더는 어떻게 동작하나요?",
      a: "수능 최저 등급 기준이 있는 주요 전형의 경우, 수능 3일 전 및 24시간 전에 전용 학습 정리 멘트와 시간 관리 수칙 리마인더가 학생 및 관리자에게 다차원 이메일로 자동 전송되어 멘탈 관리를 돕습니다."
    }
  ];

  return (
    <div className="min-h-screen bg-[#11110f] text-[#f4efe9] selection:bg-[#c68b59]/30 selection:text-[#f4efe9] font-sans antialiased overflow-x-hidden relative">
      {/* Grid Overlay background matching premium aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#966f33]/10 via-[#c68b59]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-[#f4efe9]/10 bg-[#11110f]/80 backdrop-blur-md sticky top-0">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="relative size-11 overflow-hidden rounded-lg bg-black flex items-center justify-center p-0.5 shadow-lg border border-[#f4efe9]/10">
              <Image
                src="/logo.png"
                alt="Brain Factory Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-bold tracking-widest text-base block text-[#f4efe9] uppercase">
                BRAINFACTORY ACADEMY
              </span>
              <span className="text-[10px] tracking-[0.25em] text-[#966f33] font-medium block uppercase -mt-0.5">
                Design Studio (Demo Preview)
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-[#f4efe9]/20 hover:border-[#c68b59] hover:bg-[#c68b59]/10 transition-all duration-300"
          >
            ← 메인 페이지로 돌아가기
          </Link>
        </div>
      </header>

      {/* 2페이지 디자인 목업 섹션 (실제 구현된 컴포넌트 프리뷰) */}
      <section className="relative z-10 py-20 sm:py-28 overflow-hidden">
        {/* 백그라운드 오로라 빛 미세 조명 */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-[#c68b59]/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 sm:px-8 relative">
          
          {/* 헤더 영역 (시맨틱 h2 구조화 - 구글봇 인덱싱 최적화) */}
          <div className="text-center max-w-5xl mx-auto mb-16 sm:mb-24">
            <span className="text-xs font-bold text-[#c68b59] uppercase tracking-[0.3em] block mb-3 animate-pulse">
              ★ SEO {"&"} AI OVERVIEW OPTIMIZED PAGE ★
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif tracking-tight text-[#f4efe9] mb-6 leading-tight whitespace-nowrap">
              미대합격을 위한 <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e6d5c3] via-[#c68b59] to-[#966f33]">실기 {"&"} 학업 밸런스</span> 로드맵
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-[#f4efe9]/60 leading-relaxed max-w-4xl mx-auto whitespace-nowrap">
              구글AI 검색 엔진이 신뢰하는 상위 1% 합격생들의 24시간 몰입 루틴과 핵심템포를 분석하여 플래너에 완벽 매칭시켰습니다.
            </p>
          </div>

          {/* 메인 2단 구조 레이아웃 */}
          <div className="grid gap-8 lg:grid-cols-12 mb-16">
            
            {/* 왼쪽: 입시 일정표 테이블 (AI 스니펫 노출 최우선 타겟) */}
            <div className="lg:col-span-7 rounded-2xl border border-[#f4efe9]/10 bg-[#161613]/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl hover:border-[#c68b59]/30 transition-all duration-500 group">
              <h3 className="text-lg font-bold text-[#f4efe9] mb-6 flex items-center gap-2.5">
                <span className="text-[#c68b59] group-hover:scale-110 transition-transform duration-300 block">📅</span> 
                주요 미대 입시 일정 {"&"} 대응 타임라인
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs text-[#f4efe9]/80 min-w-[500px]">
                  <thead>
                    <tr className="border-b border-[#f4efe9]/10 text-[#c68b59] font-bold">
                      <th className="pb-3 pr-4 w-1/4">시기 (일정)</th>
                      <th className="pb-3 pr-4 w-1/3">주요 전형 일정</th>
                      <th className="pb-3 w-5/12">가이드 및 루틴 관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f4efe9]/5">
                    <tr className="hover:bg-white/2 transition-colors duration-200">
                      <td className="py-4 pr-4 font-semibold text-[#f4efe9]">9월 중순</td>
                      <td className="py-4 pr-4 font-medium">수시 실기 대학 원서 접수</td>
                      <td className="py-4 text-[#f4efe9]/60 leading-relaxed">9월 모의고사 성적 분석 및 각 대학별 접수일정 최종확인</td>
                    </tr>
                    <tr className="hover:bg-white/2 transition-colors duration-200">
                      <td className="py-4 pr-4 font-semibold text-[#f4efe9]">10월 - 11월</td>
                      <td className="py-4 pr-4 font-medium">대학별 미술 실기고사 실시</td>
                      <td className="py-4 text-[#f4efe9]/60 leading-relaxed">각 대학별 입학처 실기공지확인 및 실기크리틱 집중 점검</td>
                    </tr>
                    <tr className="hover:bg-white/2 transition-colors duration-200">
                      <td className="py-4 pr-4 font-semibold text-[#f4efe9]">11월 중순</td>
                      <td className="py-4 pr-4 font-medium">대학수학능력시험 (수능)</td>
                      <td className="py-4 text-[#f4efe9]/60 leading-relaxed">규칙적인 일상루틴 수행 및 수능 이후 실기대비 스케쥴 확인</td>
                    </tr>
                    <tr className="hover:bg-white/2 transition-colors duration-200">
                      <td className="py-4 pr-4 font-semibold text-[#f4efe9]">11월 말</td>
                      <td className="py-4 pr-4 font-medium">한예종 11월 입시 준비 및<br />정시 대학 결정</td>
                      <td className="py-4 text-[#f4efe9]/60 leading-relaxed">수능 가채점 결과 및 진학방향 결정 . 한예종 11월 입시 전력대비</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t border-[#f4efe9]/5 flex justify-between items-center text-[10px] text-[#f4efe9]/40">
                <span className="flex-1 mr-4 lg:whitespace-nowrap">* 본 일정은 대학별 공지에 근거하고 있으나, 개인별로 일정이 다름으로 반드시 각 대학입학처 공지사항을 최종확인해야 합니다.</span>
                <span className="font-mono text-[#c68b59] shrink-0">E-E-A-T AUTHORITATIVE</span>
              </div>
            </div>

            {/* 오른쪽: 상위 1% 합격생의 24시간 타임라인 */}
            <div className="lg:col-span-5 rounded-2xl border border-[#f4efe9]/10 bg-[#161613]/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between hover:border-[#c68b59]/30 transition-all duration-500 group">
              <div>
                <h3 className="text-lg font-bold text-[#f4efe9] mb-6 flex items-center gap-2.5">
                  <span className="text-[#c68b59] group-hover:rotate-12 transition-transform duration-300 block">⏱️</span> 
                  상위 1% 합격생의 하루 몰입 루틴
                </h3>
                <div className="relative border-l-2 border-[#c68b59]/20 pl-6 ml-3 space-y-8">
                  
                  {/* 루틴 1 */}
                  <div className="relative group/item">
                    <span className="absolute -left-[32px] top-0 w-6 h-6 rounded-full bg-[#11110f] border-2 border-[#c68b59] flex items-center justify-center text-[10px] text-[#c68b59] font-bold group-hover/item:bg-[#c68b59] group-hover/item:text-[#11110f] transition-colors duration-300">1</span>
                    <span className="text-[10px] font-mono tracking-widest text-[#c68b59] block">AM 09:00 - PM 01:00</span>
                    <h4 className="text-sm font-bold text-[#f4efe9] mt-1 group-hover/item:text-[#c68b59] transition-colors duration-300">학업 성적 방어 (수능/내신 대비)</h4>
                    <p className="text-xs text-[#f4efe9]/50 mt-1 leading-relaxed">오전 수능대비 현강, 인강을 통해 부족한 과목을 집중 공략하여 문제풀이 노하우와 개념정리를 철저하게 공략합니다.</p>
                  </div>

                  {/* 루틴 2 */}
                  <div className="relative group/item">
                    <span className="absolute -left-[32px] top-0 w-6 h-6 rounded-full bg-[#11110f] border-2 border-[#c68b59] flex items-center justify-center text-[10px] text-[#c68b59] font-bold group-hover/item:bg-[#c68b59] group-hover/item:text-[#11110f] transition-colors duration-300">2</span>
                    <span className="text-[10px] font-mono tracking-widest text-[#c68b59] block">PM 02:00 - PM 06:00</span>
                    <h4 className="text-sm font-bold text-[#f4efe9] mt-1 group-hover/item:text-[#c68b59] transition-colors duration-300">자습을 통한 오전 강의 체화</h4>
                    <p className="text-xs text-[#f4efe9]/50 mt-1 leading-relaxed">오전강의로 알게된 노하우와 개념을 일간 타이머기능과 함께 반복하여 자신의 것으로 만듭니다.</p>
                  </div>

                  {/* 루틴 3 */}
                  <div className="relative group/item">
                    <span className="absolute -left-[32px] top-0 w-6 h-6 rounded-full bg-[#11110f] border-2 border-[#c68b59] flex items-center justify-center text-[10px] text-[#c68b59] font-bold group-hover/item:bg-[#c68b59] group-hover/item:text-[#11110f] transition-colors duration-300">3</span>
                    <span className="text-[10px] font-mono tracking-widest text-[#c68b59] block">PM 07:00 - PM 10:00</span>
                    <h4 className="text-sm font-bold text-[#f4efe9] mt-1 group-hover/item:text-[#c68b59] transition-colors duration-300">질문을 겸비한 자습확장 {"&"} 수시대비 모의 실기시험</h4>
                    <p className="text-xs text-[#f4efe9]/50 mt-1 leading-relaxed">자습을 통해 질문, 피드백, 응용하고 기록유지합니다. 수시일정을 항상 체크하며, 모의시험후 크리틱요소를 기록, 누적시킵니다.</p>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 하단: 미대 입시 FAQ (구글 Rich Snippets 및 AI Overviews 타겟) */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-[#f4efe9]/10 bg-[#161613]/40 backdrop-blur-md p-6 sm:p-8 shadow-xl">
          <h3 className="text-base font-bold text-[#f4efe9] mb-6 text-center flex items-center justify-center gap-2">
            <span className="text-[#c68b59]">❓</span> 미대 입시생들이 구글에 가장 자주 묻는 질문
          </h3>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="border-b border-[#f4efe9]/5 pb-4 last:border-0 last:pb-0"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="flex w-full items-center justify-between text-left text-sm font-bold text-[#f4efe9] hover:text-[#c68b59] transition-colors py-2"
                >
                  <span className="pr-4">Q. {faq.q}</span>
                  <span className="text-xs text-[#c68b59] font-mono shrink-0 transition-transform duration-300" style={{ transform: activeFaq === index ? "rotate(180deg)" : "rotate(0deg)" }}>
                    ▼
                  </span>
                </button>
                <div 
                  className="overflow-hidden transition-all duration-300 ease-in-out text-xs text-[#f4efe9]/60 leading-relaxed"
                  style={{ 
                    maxHeight: activeFaq === index ? "200px" : "0px",
                    opacity: activeFaq === index ? 1 : 0,
                    marginTop: activeFaq === index ? "8px" : "0px"
                  }}
                >
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
          
          {/* FAQ 하단 공식 SNS 바로가기 링크 버튼 */}
          <div className="mt-8 pt-6 border-t border-[#f4efe9]/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[10px] sm:text-xs text-[#f4efe9]/40 tracking-widest uppercase font-semibold">BRAINFACTORY OFFICIAL CHANNELS</span>
            <div className="flex items-center gap-4">
              <a 
                href="https://www.instagram.com/brainfactory_design/" 
                target="_blank" 
                rel="noopener noreferrer"
                title="브레인팩토리 인스타그램 바로가기"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-[#f4efe9]/10 text-xs text-[#f4efe9]/80 hover:text-white transition-all duration-300 shadow-lg hover:shadow-pink-500/10 hover:border-[#ee2a7b] group/sns"
              >
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-4 h-4 text-[#c68b59] group-hover/sns:text-[#ee2a7b] transition-colors duration-300"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span className="font-medium tracking-tight">Instagram</span>
              </a>
              <a 
                href="https://blog.naver.com/bfsmartmobs" 
                target="_blank" 
                rel="noopener noreferrer"
                title="브레인팩토리 네이버 블로그 바로가기"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-[#f4efe9]/10 text-xs text-[#f4efe9]/80 hover:text-white transition-all duration-300 shadow-lg hover:shadow-emerald-500/10 hover:border-[#03C75A] group/sns"
              >
                <svg 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-4 h-4 text-[#c68b59] group-hover/sns:text-[#03C75A] transition-colors duration-300"
                >
                  <path d="M16.2 2H7.8C4.6 2 2 4.6 2 7.8v8.4C2 19.4 4.6 22 7.8 22h8.4c3.2 0 5.8-2.6 5.8-5.8V7.8C22 4.6 19.4 2 16.2 2zm-3.6 13.7l-2.4-3.5V16H8.2V8h2l2.4 3.5V8h2v8h-2z"/>
                </svg>
                <span className="font-medium tracking-tight">Naver Blog</span>
              </a>
            </div>
          </div>
        </div>

        {/* 안내문 */}
        <div className="mt-12 text-center text-xs text-[#f4efe9]/30">
          <p>이 화면은 2페이지에 추가될 입시 로드맵 섹션의 독립적인 로컬호스트 프리뷰입니다.</p>
          <p className="mt-1">원장님의 승인이 완료되면 본 섹션이 스크롤 페이징 구조로 자연스럽게 메인 랜딩 페이지에 합쳐지게 됩니다.</p>
        </div>

      </section>

    </div>
  );
}
