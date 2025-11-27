-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can manage roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create decks table
CREATE TABLE public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT NOT NULL,
  image_color TEXT NOT NULL,
  woocommerce_product_id TEXT,
  is_free BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view decks"
  ON public.decks FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage decks"
  ON public.decks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create cards table
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  meaning TEXT NOT NULL,
  reflection_prompt TEXT NOT NULL,
  image_color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cards"
  ON public.cards FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage cards"
  ON public.cards FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create deck_purchases table (tracks WooCommerce purchases)
CREATE TABLE public.deck_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE NOT NULL,
  woocommerce_order_id TEXT NOT NULL,
  woocommerce_customer_email TEXT NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, deck_id)
);

ALTER TABLE public.deck_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
  ON public.deck_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
  ON public.deck_purchases FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create purchases"
  ON public.deck_purchases FOR INSERT
  WITH CHECK (true);

-- Create card_draws table (history of draws)
CREATE TABLE public.card_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
  deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE NOT NULL,
  drawn_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.card_draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own draws"
  ON public.card_draws FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own draws"
  ON public.card_draws FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to check if user has access to a deck
CREATE OR REPLACE FUNCTION public.user_has_deck_access(
  _user_id UUID,
  _deck_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if deck is free
    SELECT 1 FROM public.decks 
    WHERE id = _deck_id AND is_free = true
  ) OR EXISTS (
    -- Or check if user has purchased it
    SELECT 1 FROM public.deck_purchases
    WHERE user_id = _user_id 
      AND deck_id = _deck_id 
      AND verified = true
  ) OR EXISTS (
    -- Or check if user is admin
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_decks_updated_at
  BEFORE UPDATE ON public.decks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();