-- 데브냥 RPC 함수 수정
-- Supabase SQL Editor에서 실행하세요

-- select_winning_bid 함수 수정 (awarded_bid_id 추가)
CREATE OR REPLACE FUNCTION select_winning_bid(p_bid_id UUID, p_client_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- 입찰 정보 확인
  SELECT request_id INTO v_request_id FROM bids WHERE id = p_bid_id;
  
  IF v_request_id IS NULL THEN
    RAISE EXCEPTION '입찰 정보를 찾을 수 없습니다.';
  END IF;

  -- 의뢰자 권한 확인
  IF NOT EXISTS (
    SELECT 1 FROM requests 
    WHERE id = v_request_id 
    AND client_id = p_client_id 
    AND status = 'open'
  ) THEN
    RAISE EXCEPTION '권한이 없거나 이미 마감된 의뢰입니다.';
  END IF;

  -- 입찰 선택 처리
  UPDATE bids SET is_selected = TRUE WHERE id = p_bid_id;
  
  -- 의뢰 상태 변경 (awarded_bid_id 설정!)
  UPDATE requests 
  SET 
    status = 'awarded', 
    awarded_at = NOW(), 
    awarded_bid_id = p_bid_id
  WHERE id = v_request_id;
END;
$$;

-- 완료!
