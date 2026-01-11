export interface RemoteFlashcardMetadata {
  source?: string
  courseId?: string
  questionIndex?: number
  deckName?: string
  [key: string]: unknown
}

export interface Flashcard {
  id: string
  front?: string
  back?: string
  createdAt?: string | number | Date
  metadata?: RemoteFlashcardMetadata
  deckName?: string
}

export async function loadAllFlashcards(): Promise<Flashcard[]> {
  if (typeof window === 'undefined') return []
  try {
    const response = await fetch('/api/flashcards', {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to load flashcards: ${response.status}`)
    }

    const payload = await response.json()
    if (Array.isArray(payload)) return payload as Flashcard[]
    if (Array.isArray(payload?.cards)) return payload.cards as Flashcard[]
    return []
  } catch (error) {
    console.warn('[flashcards] Failed to load remote flashcards:', error)
    return []
  }
}


