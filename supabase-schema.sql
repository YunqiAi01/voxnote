-- VoxNote 数据库建表 SQL
-- 在 Supabase SQL Editor 中运行这段代码

-- 1. 创建 notes 表
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  organized TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 开启 Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 3. 创建策略
DROP POLICY IF EXISTS "Users can read own notes" ON public.notes;
CREATE POLICY "Users can read own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notes" ON public.notes;
CREATE POLICY "Users can insert own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- 6. 创建索引（按用户和时间排序，提升查询性能）
CREATE INDEX IF NOT EXISTS notes_user_id_created_at_idx
  ON public.notes (user_id, created_at DESC);

-- ============================================================
-- 7. 创建 user_tiers 表（用户等级和额度管理）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_tiers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  notes_count_total INTEGER NOT NULL DEFAULT 0,
  organize_count_total INTEGER NOT NULL DEFAULT 0,
  lemon_squeezy_customer_id TEXT,
  subscription_id TEXT,
  subscription_status TEXT,
  subscription_end TIMESTAMPTZ,
  variant TEXT,              -- 套餐类型: monthly / yearly / flash_3months
  has_used_flash_sale BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tier"
  ON public.user_tiers FOR SELECT
  USING (auth.uid() = user_id);

-- 8. 新用户注册时自动创建 free tier
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_tiers (user_id, tier)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 如果触发器已存在则跳过（避免重复运行报错）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 9. RPC 函数：增加笔记计数
CREATE OR REPLACE FUNCTION public.increment_notes_count()
RETURNS void AS $$
BEGIN
  UPDATE public.user_tiers
  SET notes_count_total = notes_count_total + 1,
      updated_at = NOW()
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC 函数：增加整理次数
CREATE OR REPLACE FUNCTION public.increment_organize_count()
RETURNS void AS $$
BEGIN
  UPDATE public.user_tiers
  SET organize_count_total = organize_count_total + 1,
      updated_at = NOW()
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
