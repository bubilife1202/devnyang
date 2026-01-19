-- 데브냥 DB 스키마 v2 - 기능 확장
-- Supabase SQL Editor에서 실행

-- ============================================
-- 1. requests 테이블 수정 (낙찰 정보 추가)
-- ============================================
ALTER TABLE requests ADD COLUMN IF NOT EXISTS awarded_bid_id UUID REFERENCES bids(id);

-- ============================================
-- 2. 북마크 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, request_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

-- ============================================
-- 3. 알림 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_bid', 'bid_updated', 'awarded', 'not_selected', 'new_message', 'review_received', 'payment_received', 'project_completed')),
  title TEXT NOT NULL,
  content TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- ============================================
-- 4. 리뷰 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_visible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_id, reviewer_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews visible after both submitted" ON reviews
  FOR SELECT USING (
    is_visible = TRUE 
    OR auth.uid() = reviewer_id 
    OR auth.uid() = reviewee_id
  );

CREATE POLICY "Users can create reviews for their projects" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_request ON reviews(request_id);

-- 양측 리뷰 완료 시 자동 공개 함수
CREATE OR REPLACE FUNCTION check_and_publish_reviews() RETURNS TRIGGER LANGUAGE plpgsql AS '
BEGIN
  -- 해당 request의 모든 리뷰가 2개 (양측 작성) 되면 공개
  IF (SELECT COUNT(*) FROM reviews WHERE request_id = NEW.request_id) >= 2 THEN
    UPDATE reviews SET is_visible = TRUE WHERE request_id = NEW.request_id;
  END IF;
  RETURN NEW;
END;
';

DROP TRIGGER IF EXISTS trigger_publish_reviews ON reviews;
CREATE TRIGGER trigger_publish_reviews
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION check_and_publish_reviews();

-- ============================================
-- 5. 포트폴리오 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio items are viewable by everyone" ON portfolio_items
  FOR SELECT USING (true);

CREATE POLICY "Developers can manage own portfolio" ON portfolio_items
  FOR INSERT WITH CHECK (auth.uid() = developer_id);

CREATE POLICY "Developers can update own portfolio" ON portfolio_items
  FOR UPDATE USING (auth.uid() = developer_id);

CREATE POLICY "Developers can delete own portfolio" ON portfolio_items
  FOR DELETE USING (auth.uid() = developer_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_developer ON portfolio_items(developer_id);

-- ============================================
-- 6. 채팅방 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  developer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_id, developer_id)
);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat rooms" ON chat_rooms
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = developer_id);

CREATE POLICY "Developers can create chat rooms when bidding" ON chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = developer_id);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_client ON chat_rooms(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_developer ON chat_rooms(developer_id);

-- ============================================
-- 7. 메시지 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their rooms" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE chat_rooms.id = messages.room_id 
      AND (chat_rooms.client_id = auth.uid() OR chat_rooms.developer_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their rooms" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE chat_rooms.id = room_id 
      AND (chat_rooms.client_id = auth.uid() OR chat_rooms.developer_id = auth.uid())
    )
  );

CREATE POLICY "Users can update read status" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE chat_rooms.id = messages.room_id 
      AND (chat_rooms.client_id = auth.uid() OR chat_rooms.developer_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at DESC);

-- 메시지 전송 시 채팅방 last_message_at 업데이트
CREATE OR REPLACE FUNCTION update_chat_room_last_message() RETURNS TRIGGER LANGUAGE plpgsql AS '
BEGIN
  UPDATE chat_rooms SET last_message_at = NEW.created_at WHERE id = NEW.room_id;
  RETURN NEW;
END;
';

DROP TRIGGER IF EXISTS trigger_update_last_message ON messages;
CREATE TRIGGER trigger_update_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_room_last_message();

-- ============================================
-- 8. 결제 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  bid_id UUID REFERENCES bids(id) ON DELETE CASCADE NOT NULL,
  payer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  payee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT CHECK (status IN ('pending', 'paid', 'held', 'released', 'refunded', 'disputed')) DEFAULT 'pending',
  payment_key TEXT,
  order_id TEXT UNIQUE,
  refund_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = payer_id OR auth.uid() = payee_id);

CREATE POLICY "Payers can create payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "System can update payments" ON payments
  FOR UPDATE USING (auth.uid() = payer_id OR auth.uid() = payee_id);

CREATE INDEX IF NOT EXISTS idx_payments_request ON payments(request_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status) WHERE status IN ('held', 'pending');

-- ============================================
-- 9. 신고 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'request', 'message', 'review')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')) DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status) WHERE status = 'pending';

-- ============================================
-- 10. 프로필에 평균 평점 컬럼 추가
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- 리뷰 추가 시 평균 평점 자동 업데이트
CREATE OR REPLACE FUNCTION update_profile_rating() RETURNS TRIGGER LANGUAGE plpgsql AS '
BEGIN
  UPDATE profiles 
  SET 
    avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_visible = TRUE),
    review_count = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_visible = TRUE)
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
';

DROP TRIGGER IF EXISTS trigger_update_rating ON reviews;
CREATE TRIGGER trigger_update_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_profile_rating();

-- ============================================
-- 11. Realtime 활성화 (채팅용)
-- ============================================
-- Supabase Dashboard에서 messages 테이블 Realtime 활성화 필요
-- Database > Replication > messages 테이블 선택

-- ============================================
-- 완료!
-- ============================================
