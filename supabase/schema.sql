-- 데브냥 DB 스키마
-- Supabase SQL Editor에서 실행

-- 사용자 프로필 (Supabase Auth와 연동)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('client', 'developer')),
  bio TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 의뢰 (Request)
CREATE TABLE requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) >= 5),
  description TEXT NOT NULL CHECK (char_length(description) >= 20),
  budget_min INTEGER NOT NULL CHECK (budget_min > 0),
  budget_max INTEGER NOT NULL,
  deadline DATE,
  status TEXT CHECK (status IN ('open', 'expired', 'awarded', 'completed', 'cancelled')) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours'),
  awarded_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT budget_range_check CHECK (budget_min <= budget_max)
);

-- 입찰 (Bid)
CREATE TABLE bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  developer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  message TEXT,
  estimated_days INTEGER CHECK (estimated_days > 0),
  is_selected BOOLEAN DEFAULT FALSE,
  selected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_id, developer_id) -- 한 의뢰에 개발자당 1개 입찰
);

-- RLS (Row Level Security) 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- 프로필: 누구나 읽기, 본인만 수정
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 의뢰: 누구나 읽기, 의뢰자만 생성/수정
CREATE POLICY "Requests are viewable by everyone" ON requests
  FOR SELECT USING (true);

CREATE POLICY "Clients can create requests" ON requests
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own requests" ON requests
  FOR UPDATE USING (auth.uid() = client_id);

-- 입찰: 누구나 읽기, 개발자만 생성, 본인만 수정
CREATE POLICY "Bids are viewable by everyone" ON bids
  FOR SELECT USING (true);

CREATE POLICY "Developers can create bids" ON bids
  FOR INSERT WITH CHECK (auth.uid() = developer_id);

CREATE POLICY "Developers can update own bids" ON bids
  FOR UPDATE USING (auth.uid() = developer_id);

-- 의뢰자가 낙찰자 선택할 수 있도록
CREATE POLICY "Clients can select winning bid" ON bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM requests 
      WHERE requests.id = bids.request_id 
      AND requests.client_id = auth.uid()
    )
  );

-- 인덱스
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_expires_at ON requests(expires_at);
CREATE INDEX idx_requests_client_id ON requests(client_id);
CREATE INDEX idx_requests_status_expires ON requests(status, expires_at);
CREATE INDEX idx_bids_request_id ON bids(request_id);
CREATE INDEX idx_bids_developer_id ON bids(developer_id);
CREATE INDEX idx_bids_is_selected ON bids(is_selected) WHERE is_selected = TRUE;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bids_updated_at
  BEFORE UPDATE ON bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 새 유저 가입 시 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 낙찰 선택 함수 (트랜잭션 보장)
CREATE OR REPLACE FUNCTION select_winning_bid(p_bid_id UUID, p_client_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_request_id UUID;
  v_request_client_id UUID;
BEGIN
  -- 입찰 및 의뢰 정보 조회
  SELECT b.request_id, r.client_id INTO v_request_id, v_request_client_id
  FROM bids b
  JOIN requests r ON r.id = b.request_id
  WHERE b.id = p_bid_id;
  
  -- 권한 확인: 의뢰자만 선택 가능
  IF v_request_client_id != p_client_id THEN
    RAISE EXCEPTION 'Only the client can select a winning bid';
  END IF;
  
  -- 기존 선택 해제
  UPDATE bids SET is_selected = FALSE, selected_at = NULL
  WHERE request_id = v_request_id AND is_selected = TRUE;
  
  -- 새 낙찰자 선택
  UPDATE bids SET is_selected = TRUE, selected_at = NOW()
  WHERE id = p_bid_id;
  
  -- 의뢰 상태 변경
  UPDATE requests SET status = 'awarded', awarded_at = NOW()
  WHERE id = v_request_id;
  
  RETURN TRUE;
END;
$$ language 'plpgsql' SECURITY DEFINER;
