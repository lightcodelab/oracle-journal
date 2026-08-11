-- 1. AreekeerA healing resources: visual identifier tags
create temporary table _vis_pairs(rt text, tg text, cat text) on commit drop;
insert into _vis_pairs(rt, tg, cat) values
('10 Master Cells','Master Cells','visual'),
('10 Master Cells','Cellular Blueprint','visual'),
('10 Master Cells','High-Vibration Light','visual'),
('380 nanometer laser pen','Laser Pen','visual'),
('380 nanometer laser pen','Lilac Light','colour'),
('380 nanometer laser pen','380nm Frequency','visual'),
('380 Nanometer Pyramid','Pyramid','visual'),
('380 Nanometer Pyramid','Sacred Geometry','visual'),
('380 Nanometer Pyramid','Lilac Light','colour'),
('380 Nanometer Pyramid','380nm Frequency','visual'),
('Alimentary Canal Balloon','Balloon','visual'),
('Alimentary Canal Balloon','Gut Lining','body'),
('Angel Wings','Angel Wings','visual'),
('Angel Wings','Shoulder Blades','body'),
('Blue Ball of Light','Ball of Light','visual'),
('Blue Ball of Light','Royal Blue','colour'),
('Broken Bones','Bone Repair','body'),
('Broken Bones','Cellular Layering','visual'),
('Butterfly Catcher','Butterfly Net','visual'),
('Butterfly Catcher','Sifting','visual'),
('Chakra Balance','Chakra Wheels','visual'),
('Chakra Balance','Seven Centres','visual'),
('Chicken Soup Recipe','Bone Broth','kitchen'),
('Chicken Soup Recipe','Kitchen Remedy','kitchen'),
('Conquer Anxiety','Thymus Tap','body'),
('DNA Codon Activation','DNA Helix','visual'),
('DNA Codon Activation','Codons','visual'),
('Flower Balance','Flowers','visual'),
('Fluid Retention Reset','Lymphatic Flow','body'),
('Fluid Retention Reset','Flowing Water','visual'),
('Full Body Tune Up','Holographic Hoop','visual'),
('Full Body Tune Up','Body Scan','visual'),
('Hamburger Buns','Hamburger Buns','visual'),
('Hamburger Buns','Scars and Adhesions','body'),
('Headache and Migraine','Head and Temples','body'),
('Infection Protection','Bloodstream','body'),
('Infection Protection','Sieve Filter','visual'),
('Insomnia Obliterator','Private Sanctuary','setting'),
('Insomnia Obliterator','Colour Coded','colour'),
('Lower Back - Cellular Tension Release','Lower Back','body'),
('Meeting Room','Meeting Room','setting'),
('Meeting Room','Time Travel','visual'),
('Neck - Cellular Tension Release','Neck','body'),
('Neck Atlas','Atlas Vertebrae','body'),
('Neck Atlas','Holographic Workforce','visual'),
('Oregano Tea Recipe','Herbal Tea','kitchen'),
('Oregano Tea Recipe','Kitchen Remedy','kitchen'),
('Regeneration Meditation','Golden Source Light','colour'),
('Regeneration Meditation','Cord Cutting','visual'),
('Shoulders - Cellular Tension Release','Shoulders','body'),
('Skin Healing - Burn','Skin Layers','body'),
('Skin Healing - Burn','Burns and Blisters','body'),
('Spine and Nervous System','Spinal Column','body'),
('Spine and Nervous System','Nervous System','body'),
('T-Cell Immunity','T-Cells','body'),
('T-Cell Immunity','Bone Marrow','body'),
('T-Cell Immunity','Thymus Tap','body'),
('The Waterfall','Waterfall','visual'),
('The Waterfall','Flowing Water','visual'),
('Waste Disposal Unit','Trapdoor','visual'),
('Waste Disposal Unit','Waste Disposal','visual');

insert into public.resource_tags(name, category)
select distinct p.tg, min(p.cat)
from _vis_pairs p
where not exists (select 1 from public.resource_tags t where lower(t.name) = lower(p.tg))
group by p.tg;

insert into public.resource_tag_assignments(resource_id, tag_id)
select hr.id, t.id
from _vis_pairs p
join public.healing_resources hr on lower(hr.title) = lower(p.rt)
join public.resource_tags t on lower(t.name) = lower(p.tg)
on conflict do nothing;

-- 2. Content resources (courses/resources uploader): visual identifier tags
create temporary table _vis_pairs2(rt text, tg text) on commit drop;
insert into _vis_pairs2(rt, tg) values
('380 Glitter Healing','380 Glitter'),
('380 Glitter Healing','Rainbow Spectrum'),
('380 Glitter Healing','Lilac Light'),
('Antarctic Crystal City','Crystal City'),
('Antarctic Crystal City','Ice and Snow'),
('Antarctic Crystal City','Magic Carpet'),
('Beach Portal Meditation','Beach'),
('Beach Portal Meditation','Portal'),
('Beach Portal Meditation','Ocean'),
('Beat of Earth Meditation','Heartbeat of Earth'),
('Beat of Earth Meditation','Quiver Reset'),
('Calm Peace Trust','Ocean Stillness'),
('Calm Peace Trust','Nature Imagery'),
('Cappadocia Font of Healing Meditation','Cappadocia Caves'),
('Cappadocia Font of Healing Meditation','Font of Healing Water'),
('Coal Removal Meditation','Coal Deposits'),
('Coal Removal Meditation','Extraction'),
('Crack in Time','Crack in Time'),
('Crack in Time','Meeting Room'),
('Crack in Time','Time Travel'),
('Crystal Healing Bed Meditation','Crystal Bed'),
('Crystal Healing Bed Meditation','Celestial Light'),
('Help Kids Sleep Meditation','Glowing Seahorses'),
('Help Kids Sleep Meditation','Underwater'),
('Help Kids Sleep Meditation','For Children'),
('Quiver Reset','Quiver Reset'),
('Quiver Reset','Somatic Shake'),
('The Cave with Opening in Roof','Ocean Cave'),
('The Cave with Opening in Roof','Sand Immersion'),
('The Cave with Opening in Roof','Earth Magnetism');

insert into public.course_tags(name, color)
select distinct p.tg, '#8b5cf6'
from _vis_pairs2 p
where not exists (select 1 from public.course_tags t where lower(t.name) = lower(p.tg));

insert into public.content_resource_tag_assignments(resource_id, tag_id)
select cr.id, t.id
from _vis_pairs2 p
join public.content_resources cr on lower(cr.title) = lower(p.rt)
join public.course_tags t on lower(t.name) = lower(p.tg)
on conflict do nothing;