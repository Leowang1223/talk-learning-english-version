const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const pluginsDir = path.join(repoRoot, 'apps', 'backend', 'src', 'plugins')
const lessonsRoot = path.join(pluginsDir, 'chinese-lessons')
const chaptersFile = path.join(pluginsDir, 'chapters.json')

function pad(num) {
  return num.toString().padStart(2, '0')
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.warn('[update-chapter-rules] Failed to parse', filePath, err)
    return null
  }
}

function buildLessonEntry(chapter, lesson, index) {
  const lessonNumber = lesson.lesson_number ?? index + 1
  const canonicalId = (lesson.id || `${chapter.id}-L${pad(lessonNumber)}`).toUpperCase()
  const fileName = lesson.file || `lesson-${pad(lessonNumber)}.json`
  const lessonDir = path.join(lessonsRoot, chapter.directory || chapter.id.toLowerCase())
  const filePath = path.join(lessonDir, fileName)
  const fileData = loadJson(filePath) || {}
  const steps = Array.isArray(fileData.steps) ? fileData.steps.length : 0

  const entry = {
    lesson_id: canonicalId,
    title: fileData.title || lesson.title || `Lesson ${lessonNumber}`,
    description: fileData.description || lesson.description || chapter.description || '',
    stepCount: steps,
    enable: lesson.enable === undefined ? true : Boolean(lesson.enable)
  }

  return { entry, lessonDir }
}

function updateChapterRule(chapter) {
  if (!chapter.lessons || !chapter.lessons.length) return

  const lessons = chapter.lessons.map((lesson, index) => buildLessonEntry(chapter, lesson, index).entry)
  const rulePayload = {
    playbackMode: 'tts',
    lessons
  }

  const { lessonDir } = buildLessonEntry(chapter, chapter.lessons[0], 0)
  const rulePath = path.join(lessonDir, 'rule')
  fs.writeFileSync(rulePath, JSON.stringify(rulePayload, null, 2), 'utf8')
  console.log('[update-chapter-rules] Updated', rulePath)
}

function main() {
  const config = loadJson(chaptersFile)
  const chapters = Array.isArray(config?.chapters) ? config.chapters : []
  if (!chapters.length) {
    console.warn('[update-chapter-rules] No chapters found in config.')
    process.exit(1)
  }

  chapters.forEach(updateChapterRule)
}

main()
