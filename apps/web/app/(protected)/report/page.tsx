'use client';
import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { apiGenerateReport, type Report } from '@/lib/api';

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function ReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 從 URL 參數獲取報告數據或生成測試報告
    const generateTestReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const testData = {
          sessionId: "test-session-" + Date.now(), // 新增：測試用的 session ID
          studentName: "John Smith",
          lessonTitle: "Lesson 3 – Asking for Names",
          lessonObjective: "Students learned how to ask and answer questions about names in Chinese using '你叫什么名字？' and '我叫...'.",
          dateCompleted: new Date().toISOString().split('T')[0],
          questions: [
            {
              id: 1,
              prompt: {
                chinese: "你叫什么名字？",
                pinyin: "nǐ jiào shén me míng zì?",
                english: "What is your name?"
              },
              studentAnswer: "ni jiao shen me ming zi",
              scores: { Pronunciation: 85, Fluency: 80, Accuracy: 95, Comprehension: 90 }
            },
            {
              id: 2,
              prompt: {
                chinese: "我叫Tom。",
                pinyin: "wǒ jiào Tom.",
                english: "My name is Tom."
              },
              studentAnswer: "wo jiao tom",
              scores: { Pronunciation: 80, Fluency: 75, Accuracy: 90, Comprehension: 85 }
            },
            {
              id: 3,
              prompt: {
                chinese: "請用 '我叫' 造句。",
                pinyin: "qǐng yòng 'wǒ jiào' zào jù.",
                english: "Please make a sentence using 'wǒ jiào' (I am called)."
              },
              studentAnswer: "wo jiao john",
              scores: { Pronunciation: 84, Fluency: 78, Accuracy: 88, Comprehension: 90 }
            }
          ],
          overallScores: { Pronunciation: 83, Fluency: 78, Accuracy: 92, Comprehension: 88, Confidence: 74 }
        };

        const generatedReport = await apiGenerateReport(testData);
        setReport(generatedReport);
      } catch (err: any) {
        setError(err.message || 'Failed to generate report');
      } finally {
        setLoading(false);
      }
    };

    generateTestReport();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar />
        <div className="flex items-center justify-center h-screen pt-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">生成學習報告中...</h2>
            <p className="text-gray-600">請稍候，正在為您準備個人化的學習建議</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar />
        <div className="flex items-center justify-center h-screen pt-12">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">載入失敗</h2>
            <pre className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">{error}</pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              重新載入
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar />
        <div className="flex items-center justify-center h-screen pt-12">
          <div className="text-center">
            <div className="text-gray-500 text-6xl mb-4">📄</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">無報告數據</h2>
            <p className="text-gray-600">無法獲取學習報告數據</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />

      <div className="max-w-4xl mx-auto px-4 py-8 pt-20">
        {/* 報告標題 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">學習進度報告</h1>
            <p className="text-lg text-gray-600">{report.lesson_title}</p>
            <p className="text-sm text-gray-500 mt-2">學生：{report.student_name} | 完成日期：{report.date_completed}</p>
          </div>
        </div>

        {/* 課程目標 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">課程目標</h2>
          <p className="text-gray-700">{report.lesson_objective}</p>
        </div>

        {/* 整體評分 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">整體評分</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{report.lesson_score.Pronunciation}</div>
              <div className="text-sm text-gray-600">發音</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{report.lesson_score.Fluency}</div>
              <div className="text-sm text-gray-600">流暢度</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{report.lesson_score.Accuracy}</div>
              <div className="text-sm text-gray-600">準確度</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{report.lesson_score.Comprehension}</div>
              <div className="text-sm text-gray-600">理解度</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600">{report.lesson_score.Confidence}</div>
              <div className="text-sm text-gray-600">信心度</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{report.lesson_score.Total}</div>
              <div className="text-sm text-gray-600">總分</div>
            </div>
          </div>
        </div>

        {/* 教師回饋 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">教師回饋</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">總結</h3>
              <p className="text-gray-700">{report.overall_feedback.teacher_summary}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">下一個重點</h3>
              <p className="text-gray-700">{report.overall_feedback.next_focus}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">鼓勵</h3>
              <p className="text-gray-700">{report.overall_feedback.encouragement}</p>
            </div>
          </div>
        </div>

        {/* 問題回饋 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">問題回饋</h2>
          <div className="space-y-6">
            {report.question_feedback.map((feedback, index) => (
              <div key={feedback.question_id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <div className="mb-3">
                  <h3 className="font-medium text-gray-900 mb-2">問題 {feedback.question_id}</h3>
                  <div className="bg-gray-50 rounded p-3 mb-3">
                    <p className="text-sm text-gray-600 mb-1"><strong>中文：</strong>{feedback.original_prompt.chinese}</p>
                    <p className="text-sm text-gray-600 mb-1"><strong>拼音：</strong>{feedback.original_prompt.pinyin}</p>
                    <p className="text-sm text-gray-600"><strong>英文：</strong>{feedback.original_prompt.english}</p>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm text-gray-600"><strong>你的回答：</strong>{feedback.student_answer}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">{feedback.evaluation.Pronunciation}</div>
                      <div className="text-xs text-gray-600">發音</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{feedback.evaluation.Fluency}</div>
                      <div className="text-xs text-gray-600">流暢度</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-600">{feedback.evaluation.Accuracy}</div>
                      <div className="text-xs text-gray-600">準確度</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-orange-600">{feedback.evaluation.Comprehension}</div>
                      <div className="text-xs text-gray-600">理解度</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-700"><strong>教師建議：</strong>{feedback.teacher_comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 練習建議 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">練習建議</h2>
          <div className="space-y-4">
            {report.practice_recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{index + 1}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 capitalize">{rec.type.replace('_', ' ')}</h3>
                  <p className="text-gray-700 mt-1">{rec.description}</p>
                  <p className="text-sm text-gray-600 mt-1">建議時間：{rec.duration}</p>
                  {rec.audio_link && (
                    <a href={rec.audio_link} className="text-blue-600 hover:text-blue-800 text-sm mt-1 inline-block">
                      聽音頻練習 →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 教師簽名 */}
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-600">{report.teacher_signature}</p>
        </div>
      </div>
    </div>
  );
}