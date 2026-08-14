-- Arrival-B3.1 fixture teardown: remove all verification residue.
DELETE FROM public.arrival_answers a
 USING public.arrival_interactions i
 WHERE a.interaction_id = i.id
   AND i.questionnaire_version_id IN (
     'aaaaaaaa-0000-4000-8000-00000000b301',
     'bbbbbbbb-0000-4000-8000-00000000b301');

DELETE FROM public.arrival_interactions
 WHERE questionnaire_version_id IN (
   'aaaaaaaa-0000-4000-8000-00000000b301',
   'bbbbbbbb-0000-4000-8000-00000000b301');

ALTER TABLE public.arrival_answer_options DISABLE TRIGGER USER;
ALTER TABLE public.arrival_questions DISABLE TRIGGER USER;
ALTER TABLE public.arrival_questionnaire_versions DISABLE TRIGGER USER;
ALTER TABLE public.arrival_rule_versions DISABLE TRIGGER USER;

DELETE FROM public.arrival_answer_options
 WHERE question_id IN (
   SELECT id FROM public.arrival_questions
   WHERE questionnaire_version_id IN (
     'aaaaaaaa-0000-4000-8000-00000000b301',
     'bbbbbbbb-0000-4000-8000-00000000b301'));

DELETE FROM public.arrival_questions
 WHERE questionnaire_version_id IN (
   'aaaaaaaa-0000-4000-8000-00000000b301',
   'bbbbbbbb-0000-4000-8000-00000000b301');

DELETE FROM public.arrival_rule_versions
 WHERE id IN (
   'aaaaaaaa-0000-4000-8000-00000000b302',
   'bbbbbbbb-0000-4000-8000-00000000b302');

DELETE FROM public.arrival_questionnaire_versions
 WHERE id IN (
   'aaaaaaaa-0000-4000-8000-00000000b301',
   'bbbbbbbb-0000-4000-8000-00000000b301');

ALTER TABLE public.arrival_answer_options ENABLE TRIGGER USER;
ALTER TABLE public.arrival_questions ENABLE TRIGGER USER;
ALTER TABLE public.arrival_questionnaire_versions ENABLE TRIGGER USER;
ALTER TABLE public.arrival_rule_versions ENABLE TRIGGER USER;