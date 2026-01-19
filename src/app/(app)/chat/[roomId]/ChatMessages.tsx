'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/lib/actions/chat'

interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  sender?: {
    id: string
    name: string | null
  }
}

interface ChatMessagesProps {
  roomId: string
  initialMessages: Message[]
  currentUserId: string
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ChatMessages({ roomId, initialMessages, currentUserId }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  // 스크롤 맨 아래로
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 실시간 구독
  useEffect(() => {
    let isMounted = true
    
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message
          
          // sender 정보 가져오기
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('id', newMsg.sender_id)
            .single()
          
          // 마운트 해제 후 setState 방지
          if (!isMounted) return
          
          const messageWithSender: Message = {
            ...newMsg,
            sender: sender ? { id: sender.id, name: sender.name } : undefined,
          }
          
          setMessages((prev) => [...prev, messageWithSender])
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [roomId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    const result = await sendMessage(roomId, newMessage)
    
    if (result.success) {
      setNewMessage('')
    }
    setSending(false)
  }

  // 날짜별 그룹화
  let lastDate = ''

  return (
    <>
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            대화를 시작해보세요!
          </div>
        ) : (
          messages.map((message) => {
            const messageDate = formatDate(message.created_at)
            const showDate = messageDate !== lastDate
            lastDate = messageDate

            const isMe = message.sender_id === currentUserId

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="text-center py-2">
                    <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                      {messageDate}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                    {!isMe && (
                      <span className="text-xs text-zinc-500 mb-1 block">
                        {message.sender?.name || '알 수 없음'}
                      </span>
                    )}
                    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-400 flex-shrink-0">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </>
  )
}
