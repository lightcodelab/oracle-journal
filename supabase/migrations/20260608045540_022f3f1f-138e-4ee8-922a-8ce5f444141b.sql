
-- =========================================
-- TRANSFORMATION TRACKING TOOLS — SCHEMA
-- =========================================

CREATE TABLE public.transformation_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  short_description text,
  purpose text,
  when_to_use text,
  intro_microcopy text,
  save_button_label text NOT NULL DEFAULT 'Save Entry',
  icon_name text DEFAULT 'Sparkles',
  display_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  score_formula jsonb NOT NULL DEFAULT '{"type":"none"}'::jsonb,
  recommended_resource_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.transformation_tools TO authenticated;
GRANT ALL ON public.transformation_tools TO service_role;
ALTER TABLE public.transformation_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view published tools"
  ON public.transformation_tools FOR SELECT TO authenticated
  USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage tools"
  ON public.transformation_tools FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


CREATE TABLE public.transformation_tool_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.transformation_tools(id) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,
  key text NOT NULL,
  label text NOT NULL,
  helper_text text,
  field_type text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  min int,
  max int,
  min_label text,
  max_label text,
  is_required boolean NOT NULL DEFAULT false,
  contributes_to_score boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tool_id, key)
);

GRANT SELECT ON public.transformation_tool_fields TO authenticated;
GRANT ALL ON public.transformation_tool_fields TO service_role;
ALTER TABLE public.transformation_tool_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view fields of published tools"
  ON public.transformation_tool_fields FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transformation_tools t WHERE t.id = tool_id AND (t.is_published = true OR has_role(auth.uid(),'admin'::app_role))));
CREATE POLICY "Admins manage tool fields"
  ON public.transformation_tool_fields FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));


CREATE TABLE public.transformation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool_id uuid NOT NULL REFERENCES public.transformation_tools(id) ON DELETE CASCADE,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  scores_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_card_id uuid,
  linked_course_id uuid,
  linked_symptom_pathway text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transformation_entries_user_tool ON public.transformation_entries(user_id, tool_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transformation_entries TO authenticated;
GRANT ALL ON public.transformation_entries TO service_role;
ALTER TABLE public.transformation_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own entries"
  ON public.transformation_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all entries"
  ON public.transformation_entries FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));


CREATE TABLE public.transformation_recommendation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid REFERENCES public.transformation_tools(id) ON DELETE CASCADE,
  priority int NOT NULL DEFAULT 100,
  condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_tool_id uuid REFERENCES public.transformation_tools(id) ON DELETE SET NULL,
  recommended_resource_id uuid,
  microcopy text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.transformation_recommendation_rules TO authenticated;
GRANT ALL ON public.transformation_recommendation_rules TO service_role;
ALTER TABLE public.transformation_recommendation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view active rules"
  ON public.transformation_recommendation_rules FOR SELECT TO authenticated
  USING (is_active = true OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage rules"
  ON public.transformation_recommendation_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));


CREATE TABLE public.transformation_insights_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  insight_text text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transformation_insights_cache TO authenticated;
GRANT ALL ON public.transformation_insights_cache TO service_role;
ALTER TABLE public.transformation_insights_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own insight cache"
  ON public.transformation_insights_cache FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- Triggers
CREATE TRIGGER trg_tt_tools_updated BEFORE UPDATE ON public.transformation_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tt_fields_updated BEFORE UPDATE ON public.transformation_tool_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tt_entries_updated BEFORE UPDATE ON public.transformation_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tt_rules_updated BEFORE UPDATE ON public.transformation_recommendation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =========================================
-- SEED DATA — 9 tools
-- =========================================
DO $seed$
DECLARE
  v_tool_id uuid;
  protector_opts jsonb := '["Fixer","Pleaser","Controller","Rescuer","Performer","Invisible One","Good Girl","Numb One","Overthinker","Other"]'::jsonb;
  body_sensations jsonb := '["racing heart","tight chest","stomach drop","numbness","fog","heat","shaking","heaviness","other"]'::jsonb;
  emotion_opts jsonb := '["grief","anger","fear","shame","loneliness","joy","relief","numbness","longing","tenderness","other"]'::jsonb;
BEGIN

-- 1. Clarity Scan
INSERT INTO public.transformation_tools (slug,title,short_description,purpose,when_to_use,intro_microcopy,save_button_label,icon_name,display_order,score_formula)
VALUES ('clarity-scan','Clarity Scan','Separate facts, stories, emotions, protectors, and truth.','Helps you tell the difference between what happened and what your mind made of it.','When your thoughts feel tangled or a moment keeps replaying.','Take a breath. Soften the jaw. Begin when you are ready.','Save as Revelation','Eye',1,
  '{"type":"single","field":"clarity_now","max":4}'::jsonb)
RETURNING id INTO v_tool_id;
INSERT INTO public.transformation_tool_fields (tool_id,order_index,key,label,field_type,options,min,max,min_label,max_label,is_required,contributes_to_score) VALUES
 (v_tool_id,1,'what_happened','What happened?','textarea','[]',NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,2,'mind_story','What story did your mind create?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,3,'emotion','What emotion did this provoke?','dropdown',emotion_opts,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,4,'protector','Which Protector Part appeared?','dropdown',protector_opts,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,5,'what_is_true','What is actually true?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,6,'clarity_now','How clear do you feel now?','slider','[]',0,4,'foggy','clear',true,true);

-- 2. Coherence Calibration
INSERT INTO public.transformation_tools (slug,title,short_description,purpose,when_to_use,intro_microcopy,save_button_label,icon_name,display_order,score_formula)
VALUES ('coherence-calibration','Coherence Calibration','Does your inner truth match your outer life?','Tracks whether inner truth and outer behaviour are aligned.','When you sense the gap between what you know and how you live.','Notice the body. What is true today?','Save Calibration','Compass',2,
  '{"type":"average","fields":["mental","emotional","behavioural","energetic"],"max":10}'::jsonb)
RETURNING id INTO v_tool_id;
INSERT INTO public.transformation_tool_fields (tool_id,order_index,key,label,field_type,options,min,max,min_label,max_label,is_required,contributes_to_score) VALUES
 (v_tool_id,1,'truth_today','What is true for you today?','textarea','[]',NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,2,'honour_action','What action would honour that truth?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,3,'betray_action','What action would betray that truth?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,4,'nervous_system_need','What does your nervous system need so the aligned action feels safe?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,5,'mental','Mental coherence','slider','[]',0,10,'scattered','aligned',true,true),
 (v_tool_id,6,'emotional','Emotional coherence','slider','[]',0,10,'shut','open',true,true),
 (v_tool_id,7,'behavioural','Behavioural coherence','slider','[]',0,10,'misaligned','aligned',true,true),
 (v_tool_id,8,'energetic','Energetic coherence','slider','[]',0,10,'depleted','radiant',true,true);

-- 3. Regulation Log
INSERT INTO public.transformation_tools (slug,title,short_description,purpose,when_to_use,intro_microcopy,save_button_label,icon_name,display_order,score_formula)
VALUES ('regulation-log','Regulation Log','Track activation and return to baseline.','Tracks nervous system activation and the path back home.','After an activation, big or small.','You are safe enough to look. What activated you?','Save Regulation Log','Waves',3,
  '{"type":"ordinal","field":"return_time"}'::jsonb)
RETURNING id INTO v_tool_id;
INSERT INTO public.transformation_tool_fields (tool_id,order_index,key,label,field_type,options,min,max,min_label,max_label,is_required,contributes_to_score) VALUES
 (v_tool_id,1,'activated_by','What activated you?','textarea','[]',NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,2,'breath','Breath state','slider','[]',0,4,'shallow','soft',true,true),
 (v_tool_id,3,'chest','Chest state','slider','[]',0,4,'constricted','open',true,true),
 (v_tool_id,4,'jaw','Jaw state','slider','[]',0,4,'locked','loose',true,true),
 (v_tool_id,5,'body_sensations','Body sensations','multiselect',body_sensations,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,6,'what_helped','What helped you regulate?','multiselect','["breath","grounding","movement","crying","water","rest","sound","touch","support","other"]'::jsonb,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,7,'return_time','How long did it take to return?','dropdown',
   '[{"label":"under 5 mins","value":4},{"label":"5\u201315 mins","value":3},{"label":"15\u201360 mins","value":2},{"label":"1\u20134 hours","value":1},{"label":"all day","value":0.5},{"label":"longer","value":0}]'::jsonb,
   NULL,NULL,NULL,NULL,true,true);

-- 4. Boundary Integrity Audit
INSERT INTO public.transformation_tools (slug,title,short_description,purpose,when_to_use,intro_microcopy,save_button_label,icon_name,display_order,score_formula)
VALUES ('boundary-integrity-audit','Boundary Integrity Audit','Where did you hold, abandon, or repair a boundary?','Helps you see where the body said no and the mouth said yes.','After an interaction that left a residue.','No shame. Just truth. What happened?','Save Boundary Audit','Shield',4,
  '{"type":"single","field":"integrity_rating","max":4}'::jsonb)
RETURNING id INTO v_tool_id;
INSERT INTO public.transformation_tool_fields (tool_id,order_index,key,label,field_type,options,min,max,min_label,max_label,is_required,contributes_to_score) VALUES
 (v_tool_id,1,'situation','What situation involved a boundary?','textarea','[]',NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,2,'body_signal','Was your body a yes, no, or unsure?','radio','["Yes","No","Unsure"]'::jsonb,NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,3,'body_sensations','What did your body do?','multiselect',body_sensations,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,4,'self_abandonment','Did self-abandonment happen?','yes_no','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,5,'how_abandoned','If yes, how?','multiselect','["said yes when no","overexplained","stayed silent","rescued","absorbed emotion","tolerated disrespect","ignored capacity","other"]'::jsonb,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,6,'boundary_needed','What boundary was needed?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,7,'next_time','What will you say or do next time?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,8,'integrity_rating','Boundary integrity rating','slider','[]',0,4,'abandoned','sovereign',true,true);

-- 5. Trigger Time Map
INSERT INTO public.transformation_tools (slug,title,short_description,purpose,when_to_use,intro_microcopy,save_button_label,icon_name,display_order,score_formula)
VALUES ('trigger-time-map','Trigger Time Map','How quickly did you find truth?','Tracks the time between trigger and recognition.','After a trigger has loosened its grip.','You found your way back. Let us look at the path.','Save Trigger Map','Clock',5,
  '{"type":"ordinal","field":"recognition_time"}'::jsonb)
RETURNING id INTO v_tool_id;
INSERT INTO public.transformation_tool_fields (tool_id,order_index,key,label,field_type,options,min,max,min_label,max_label,is_required,contributes_to_score) VALUES
 (v_tool_id,1,'trigger','What triggered you?','textarea','[]',NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,2,'story_activated','What story activated?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,3,'first_sensation','What physical sensation appeared first?','multiselect',body_sensations,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,4,'protector','Which Protector Part emerged?','dropdown',protector_opts,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,5,'protector_fear','What was it afraid would happen?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,6,'truth_recognised','What truth did you recognise?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,7,'how_returned','How did you return?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,8,'recognition_time','How long until you recognised truth?','dropdown',
   '[{"label":"in the moment","value":4},{"label":"within minutes","value":3},{"label":"within an hour","value":2},{"label":"same day","value":1},{"label":"next day","value":0.5},{"label":"longer","value":0}]'::jsonb,
   NULL,NULL,NULL,NULL,true,true);

-- 6. Embodiment Tracker
INSERT INTO public.transformation_tools (slug,title,short_description,purpose,when_to_use,intro_microcopy,save_button_label,icon_name,display_order,score_formula)
VALUES ('embodiment-tracker','Embodiment Tracker','Did you act as the one you are becoming?','Tracks whether your action matched your emerging identity.','At the end of the day or after a defining moment.','Who are you becoming? Let us see if today met her.','Save Embodiment Entry','Flame',6,
  '{"type":"single","field":"embodiment_score","max":4}'::jsonb)
RETURNING id INTO v_tool_id;
INSERT INTO public.transformation_tool_fields (tool_id,order_index,key,label,field_type,options,min,max,min_label,max_label,is_required,contributes_to_score) VALUES
 (v_tool_id,1,'becoming','Who are you becoming?','textarea','[]',NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,2,'aligned_action','What was today\u2019s aligned action?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,3,'did_take','Did you take it?','yes_partial_no','[]',NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,4,'micro_collapse','Was there a micro-collapse?','yes_no','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,5,'what_happened','If yes, what happened?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,6,'repair','What repair did you make?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,7,'energy','Energy level today','slider','[]',0,10,'depleted','radiant',true,false),
 (v_tool_id,8,'embodiment_score','Embodiment score','slider','[]',0,4,'absent','fully embodied',true,true);

-- 7. Devotion Cycles
INSERT INTO public.transformation_tools (slug,title,short_description,purpose,when_to_use,intro_microcopy,save_button_label,icon_name,display_order,score_formula)
VALUES ('devotion-cycles','Devotion Cycles','Vow, wobble, repair, return.','Tracks the living rhythm of a vow.','Weekly, or after a significant wobble or repair.','A vow is not a cage. It is a return. Let us look at the week.','Save Devotion Cycle','Heart',7,
  '{"type":"average","fields":["presence","honesty","follow_through"],"max":4}'::jsonb)
RETURNING id INTO v_tool_id;
INSERT INTO public.transformation_tool_fields (tool_id,order_index,key,label,field_type,options,min,max,min_label,max_label,is_required,contributes_to_score) VALUES
 (v_tool_id,1,'vow','What vow are you in right now?','textarea','[]',NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,2,'honoured','Did you honour it this week?','yes_partial_no','[]',NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,3,'wobble_where','Where did you wobble?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,4,'wobble_trigger','What triggered the wobble?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,5,'protector','What Protector Part intervened?','dropdown',protector_opts,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,6,'repair','How did you repair?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,7,'softened','What softened?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,8,'strengthened','What strengthened?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,9,'presence','Presence','slider','[]',0,4,'distracted','present',true,true),
 (v_tool_id,10,'honesty','Honesty','slider','[]',0,4,'concealed','transparent',true,true),
 (v_tool_id,11,'follow_through','Follow-through','slider','[]',0,4,'abandoned','complete',true,true);

-- 8. Stability Spiral
INSERT INTO public.transformation_tools (slug,title,short_description,purpose,when_to_use,intro_microcopy,save_button_label,icon_name,display_order,score_formula)
VALUES ('stability-spiral','Stability Spiral','Long-term coherence, rupture, repair, new baseline.','Tracks your stability over time and the patterns of rupture and return.','Weekly or monthly review.','Stability is not stillness. It is the speed of your return.','Save Stability Spiral','Infinity',8,
  '{"type":"single","field":"baseline","max":4}'::jsonb)
RETURNING id INTO v_tool_id;
INSERT INTO public.transformation_tool_fields (tool_id,order_index,key,label,field_type,options,min,max,min_label,max_label,is_required,contributes_to_score) VALUES
 (v_tool_id,1,'baseline','Baseline rating this week','slider','[]',0,4,'constant rupture','strong stability',true,true),
 (v_tool_id,2,'rupture_type','What rupture occurred?','multiselect','["emotional","somatic","energetic","relational","boundary","identity","behavioural"]'::jsonb,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,3,'rupture_cause','What caused the rupture?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,4,'repair_method','What repair method did you use?','multiselect','["regulation","re-alignment","boundary restoration","honest communication","micro-action","nervous-system reset","returning to vow"]'::jsonb,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,5,'new_baseline_insight','What is your new baseline insight?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,6,'returned_faster','Did you return faster than before?','radio','["Yes","No","Unsure"]'::jsonb,NULL,NULL,NULL,NULL,false,false);

-- 9. Distortion Speed Test
INSERT INTO public.transformation_tools (slug,title,short_description,purpose,when_to_use,intro_microcopy,save_button_label,icon_name,display_order,score_formula)
VALUES ('distortion-speed-test','Distortion Speed Test','How fast did you catch the old story?','Tracks how quickly you recognise familiar distortion patterns.','Whenever an old loop tries to run you.','Old stories visit. The question is how long they stay.','Save Distortion Test','Zap',9,
  '{"type":"single","field":"recognition_speed","max":4}'::jsonb)
RETURNING id INTO v_tool_id;
INSERT INTO public.transformation_tool_fields (tool_id,order_index,key,label,field_type,options,min,max,min_label,max_label,is_required,contributes_to_score) VALUES
 (v_tool_id,1,'distortion_family','Which distortion family appeared?','dropdown','["Worth","Safety","Belonging","Control"]'::jsonb,NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,2,'distortion_story','What was the distortion or story?','textarea','[]',NULL,NULL,NULL,NULL,true,false),
 (v_tool_id,3,'recognition_speed','How fast did you recognise it?','slider','[]',0,4,'much later','in the moment',true,true),
 (v_tool_id,4,'first_sensation','What physical sensation signalled it?','multiselect',body_sensations,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,5,'protector','Which Protector Part appeared?','dropdown',protector_opts,NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,6,'truth_replaced','What truth replaced the distortion?','textarea','[]',NULL,NULL,NULL,NULL,false,false),
 (v_tool_id,7,'aligned_action','What aligned action did you take?','textarea','[]',NULL,NULL,NULL,NULL,false,false);

END $seed$;
