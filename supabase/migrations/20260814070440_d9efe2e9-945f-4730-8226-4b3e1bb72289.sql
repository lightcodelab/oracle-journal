-- Arrival-B2.1: seed and publish the single controlled questionnaire/rule pair (arrival-v1).
DO $$
DECLARE
  v_qv uuid;
  v_rv uuid;
  q1 uuid; q2 uuid; q3 uuid; q4 uuid; q5 uuid; q6 uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.arrival_questionnaire_versions) THEN
    RAISE EXCEPTION 'arrival_questionnaire_versions is not empty; refusing to seed';
  END IF;

  INSERT INTO public.arrival_questionnaire_versions (version_number, label, status)
  VALUES (1, 'arrival-v1', 'draft')
  RETURNING id INTO v_qv;

  INSERT INTO public.arrival_questions
    (questionnaire_version_id, slug, prompt, helper_text, display_order, select_min, select_max, required)
  VALUES
    (v_qv, 'present_state', 'What feels most true right now?', 'Choose the one thing asking to be met first.', 1, 1, 1, true)
  RETURNING id INTO q1;

  INSERT INTO public.arrival_questions
    (questionnaire_version_id, slug, prompt, helper_text, display_order, select_min, select_max, required)
  VALUES
    (v_qv, 'desired_movement', 'What would feel most supportive now?', 'Not the whole answer. Just the next kind movement.', 2, 1, 1, true)
  RETURNING id INTO q2;

  INSERT INTO public.arrival_questions
    (questionnaire_version_id, slug, prompt, helper_text, display_order, select_min, select_max, required)
  VALUES
    (v_qv, 'capacity', 'How much do you have to give today?', NULL, 3, 1, 1, true)
  RETURNING id INTO q3;

  INSERT INTO public.arrival_questions
    (questionnaire_version_id, slug, prompt, helper_text, display_order, select_min, select_max, required)
  VALUES
    (v_qv, 'available_time', 'What amount of time feels kind to your day?', NULL, 4, 1, 1, true)
  RETURNING id INTO q4;

  INSERT INTO public.arrival_questions
    (questionnaire_version_id, slug, prompt, helper_text, display_order, select_min, select_max, required)
  VALUES
    (v_qv, 'preferred_form', 'What kind of support feels possible?', 'Choose any that feel welcome. We will treat this as a preference, never a demand.', 5, 1, 5, true)
  RETURNING id INTO q5;

  INSERT INTO public.arrival_questions
    (questionnaire_version_id, slug, prompt, helper_text, display_order, select_min, select_max, required)
  VALUES
    (v_qv, 'honour_first', 'Is there anything we should honour before we begin?', 'Choose any that are true. You can change your mind later.', 6, 1, 5, true)
  RETURNING id INTO q6;

  INSERT INTO public.arrival_answer_options (question_id, slug, label, display_order) VALUES
    (q1, 'activated', 'I feel activated; my system is running fast.', 1),
    (q1, 'burdened', 'I feel burdened; I am carrying more than I can hold.', 2),
    (q1, 'depleted', 'I feel depleted; there is very little left in me.', 3),
    (q1, 'heavy_cluttered', 'I feel heavy and cluttered; everything has piled up.', 4),
    (q1, 'scattered_foggy', 'I feel scattered and foggy; I cannot gather myself.', 5),
    (q1, 'tender_exposed', 'I feel tender and exposed; I need to be handled gently.', 6),
    (q1, 'disconnected', 'I feel disconnected; I am far away from myself.', 7),
    (q1, 'resistant_trapped', 'I feel resistant or trapped; something in me will not move.', 8),
    (q1, 'physically_uncomfortable', 'My body is uncomfortable; it is asking for attention.', 9),
    (q1, 'uncertain_directionless', 'I do not know what I need; I only know I need somewhere gentle to begin.', 10),
    (q1, 'relationally_distressed', 'Something between me and another person is unsettled.', 11),
    (q1, 'ready_to_deepen', 'I feel steady enough to go a little deeper.', 12);

  INSERT INTO public.arrival_answer_options (question_id, slug, label, display_order) VALUES
    (q2, 'establish_safety', 'To feel safe enough to be here.', 1),
    (q2, 'comfort_contain', 'To be comforted and held.', 2),
    (q2, 'restore_replenish', 'To be replenished.', 3),
    (q2, 'settle_anchor', 'To settle and feel anchored.', 4),
    (q2, 'clear_release', 'To set something down.', 5),
    (q2, 'orient_clarify', 'To see more clearly where I am.', 6),
    (q2, 'reconnect', 'To come back into contact with myself.', 7),
    (q2, 'express_discharge', 'To let something move through me.', 8),
    (q2, 'restore_agency', 'To feel my own choice again.', 9),
    (q2, 'integrate_deepen', 'To stay with something and let it deepen.', 10);

  INSERT INTO public.arrival_answer_options (question_id, slug, label, display_order) VALUES
    (q3, 'capacity_1', 'Very little. Please keep this small and undemanding.', 1),
    (q3, 'capacity_2', 'Some. I can meet a gentle practice.', 2),
    (q3, 'capacity_3', 'Enough to stay with something a little longer.', 3);

  INSERT INTO public.arrival_answer_options (question_id, slug, label, display_order) VALUES
    (q4, 'time_5', 'About five minutes.', 1),
    (q4, 'time_10', 'About ten minutes.', 2),
    (q4, 'time_20', 'About twenty minutes.', 3),
    (q4, 'time_open', 'I have room to linger.', 4);

  INSERT INTO public.arrival_answer_options (question_id, slug, label, display_order) VALUES
    (q5, 'guided_listening', 'Something I can listen to and be guided by.', 1),
    (q5, 'quiet_reading', 'Something quiet I can read.', 2),
    (q5, 'gentle_body', 'Something gentle with my body.', 3),
    (q5, 'reflection', 'Something to reflect or write with.', 4),
    (q5, 'no_preference', 'No preference. Choose for me.', 5);

  INSERT INTO public.arrival_answer_options (question_id, slug, label, display_order) VALUES
    (q6, 'gentle_only', 'Please keep everything gentle today.', 1),
    (q6, 'no_decisions', 'Please do not ask me to decide anything.', 2),
    (q6, 'no_deep_work', 'Please do not take me anywhere deep right now.', 3),
    (q6, 'no_connection', 'I would rather not be with other people right now.', 4),
    (q6, 'none', 'Nothing in particular.', 5);

  -- Publish the questionnaire version (accepted lifecycle: draft -> published).
  UPDATE public.arrival_questionnaire_versions
     SET status = 'published', published_at = now()
   WHERE id = v_qv;

  -- Bound rule version, published and current.
  INSERT INTO public.arrival_rule_versions (questionnaire_version_id, version_number, label, status)
  VALUES (v_qv, 1, 'arrival-v1', 'draft')
  RETURNING id INTO v_rv;

  UPDATE public.arrival_rule_versions
     SET status = 'published', published_at = now(), is_current = true
   WHERE id = v_rv;
END $$;