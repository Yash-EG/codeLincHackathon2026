-- =============================================================================
-- Dental Benefits Optimizer — mock seed data
--
-- All carriers, plans and people below are fictional. Fees are illustrative
-- 2026 national averages, not quotes.
--
-- Fixed UUIDs so the frontend mock data and backend tests can reference rows:
--   users        11111111-1111-4111-8111-00000000000X
--   plans        22222222-2222-4222-8222-00000000000X
--   enrollments  33333333-3333-4333-8333-00000000000X
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Users
-- -----------------------------------------------------------------------------
INSERT INTO users (id, email, full_name, date_of_birth, zip_code, employer) VALUES
    ('11111111-1111-4111-8111-000000000001', 'maya.chen@example.com',    'Maya Chen',    '1991-04-18', '10027', 'Codelinc Labs'),
    ('11111111-1111-4111-8111-000000000002', 'jordan.rivera@example.com', 'Jordan Rivera', '1987-09-02', '78704', 'Codelinc Labs'),
    ('11111111-1111-4111-8111-000000000003', 'sam.okafor@example.com',   'Sam Okafor',   '1979-12-11', '60614', 'Codelinc Labs');

-- -----------------------------------------------------------------------------
-- Insurance plans
-- -----------------------------------------------------------------------------
INSERT INTO insurance_plans (
    id, carrier_name, plan_name, plan_type, monthly_premium,
    deductible_individual_in, deductible_individual_out, deductible_family_in, deductible_family_out,
    annual_maximum, annual_maximum_out_network, ortho_lifetime_maximum,
    rollover_enabled, rollover_threshold, rollover_amount, rollover_cap,
    oon_reimbursement_basis, summary_of_benefits
) VALUES
(
    '22222222-2222-4222-8222-000000000001', 'Ivorycrest Mutual', 'Core PPO', 'PPO', 24.00,
    75.00, 150.00, 225.00, 450.00,
    1000.00, NULL, NULL,
    false, NULL, NULL, NULL,
    'MAC',
    $$Benefits are payable at the Coinsurance Percentage of the Maximum Allowable Charge (MAC) after satisfaction of the Calendar Year Deductible, which is waived for Class I (Diagnostic & Preventive) services. Class III (Major) services are subject to a twelve (12) month Waiting Period from the Member's Coverage Effective Date. Endosseous implants and related prosthetics (D6000-D6199) are Excluded Services. Orthodontic services are not a Covered Benefit. Prophylaxis and periodic evaluations are limited to two (2) per Benefit Period. Where alternative professionally acceptable treatments exist, benefits are determined by the Least Expensive Alternative Treatment (LEAT) provision. Non-participating providers may balance bill the Member for amounts exceeding the MAC.$$
),
(
    '22222222-2222-4222-8222-000000000002', 'Ivorycrest Mutual', 'Premier PPO', 'PPO', 42.50,
    50.00, 100.00, 150.00, 300.00,
    2000.00, NULL, 1500.00,
    true, 1000.00, 500.00, 1250.00,
    'UCR_80',
    $$The Annual Benefit Maximum of $2,000 per Covered Person applies to all Classes of service combined, in- and out-of-network. Under the Maximum Rollover provision, if paid claims during the Benefit Period do not exceed the Threshold of $1,000, $500 is credited to the Rollover Account, not to exceed the Rollover Account Limit of $1,250. Endodontic services are reimbursed under Class II (Basic) Coinsurance. Out-of-network claims are adjudicated at the 80th percentile of Usual, Customary and Reasonable (UCR) charges; Member is responsible for any balance billing. Crowns, inlays, onlays and fixed prosthetics are limited to one (1) per tooth per sixty (60) months. Unused benefits, including the Annual Maximum, do not carry forward except as provided under the Maximum Rollover provision.$$
),
(
    '22222222-2222-4222-8222-000000000003', 'Northpine Benefits', 'Freedom Indemnity', 'INDEMNITY', 51.00,
    50.00, 50.00, 150.00, 150.00,
    1500.00, NULL, NULL,
    false, NULL, NULL, NULL,
    'UCR_90',
    $$This is an Indemnity (fee-for-service) plan with no provider network. Reimbursement is based on the 90th percentile of Usual and Customary charges in the Member's geographic area; charges exceeding U&C are the Member's responsibility. A Lifetime Deductible of $50 applies to Class II and Class III services. Replacement of a prosthetic appliance is covered only if the existing appliance is more than five (5) years old and cannot be made serviceable (Missing Tooth Clause applies to teeth extracted prior to the Coverage Effective Date). Occlusal guards are Excluded. Benefits terminate on the last day of the Benefit Period in which coverage ends; services rendered after termination are not covered regardless of treatment start date.$$
);

-- Coinsurance by class (plan pays %). Core: 100/80/50, Premier: 100/80/50 in, 100/70/40 out.
INSERT INTO plan_coverage_tiers
    (plan_id, coverage_class, plan_pays_pct_in_network, plan_pays_pct_out_network, deductible_applies, waiting_period_months)
VALUES
    ('22222222-2222-4222-8222-000000000001', 'PREVENTIVE',  100, 80, false, 0),
    ('22222222-2222-4222-8222-000000000001', 'BASIC',        80, 60, true,  0),
    ('22222222-2222-4222-8222-000000000001', 'MAJOR',        50, 40, true, 12),
    ('22222222-2222-4222-8222-000000000001', 'ORTHODONTIC',   0,  0, false, 0),

    ('22222222-2222-4222-8222-000000000002', 'PREVENTIVE',  100, 100, false, 0),
    ('22222222-2222-4222-8222-000000000002', 'BASIC',        80,  70, true,  0),
    ('22222222-2222-4222-8222-000000000002', 'MAJOR',        50,  40, true,  0),
    ('22222222-2222-4222-8222-000000000002', 'ORTHODONTIC',  50,  50, false, 0),

    ('22222222-2222-4222-8222-000000000003', 'PREVENTIVE',  100, 100, false, 0),
    ('22222222-2222-4222-8222-000000000003', 'BASIC',        80,  80, true,  0),
    ('22222222-2222-4222-8222-000000000003', 'MAJOR',        50,  50, true,  0),
    ('22222222-2222-4222-8222-000000000003', 'ORTHODONTIC',   0,   0, false, 0);

-- -----------------------------------------------------------------------------
-- CDT procedures (subset of the ADA CDT code set)
-- -----------------------------------------------------------------------------
INSERT INTO cdt_procedures
    (cdt_code, category, default_coverage_class, short_name, plain_description, common_aliases, is_tooth_specific, frequency_count, frequency_months)
VALUES
    ('D0120', 'DIAGNOSTIC',  'PREVENTIVE', 'Periodic oral evaluation',          'Routine check-up exam for an existing patient.',                         '{checkup,check-up,exam}',                       false, 2, 12),
    ('D0140', 'DIAGNOSTIC',  'PREVENTIVE', 'Limited oral evaluation',           'A focused exam for one problem, like a toothache or chipped tooth.',     '{"emergency exam","problem exam",toothache}',   false, NULL, NULL),
    ('D0150', 'DIAGNOSTIC',  'PREVENTIVE', 'Comprehensive oral evaluation',     'A full first-visit exam for a new patient.',                             '{"new patient exam","first visit"}',            false, 1, 36),
    ('D0210', 'DIAGNOSTIC',  'PREVENTIVE', 'Full-mouth X-rays',                 'A complete series of X-rays of every tooth.',                            '{"full mouth x-rays",fmx,x-rays}',              false, 1, 60),
    ('D0274', 'DIAGNOSTIC',  'PREVENTIVE', 'Bitewing X-rays (4 films)',         'X-rays that look for cavities between the back teeth.',                  '{bitewings,x-rays}',                            false, 1, 12),
    ('D0330', 'DIAGNOSTIC',  'PREVENTIVE', 'Panoramic X-ray',                   'One wide X-ray of the whole jaw, often used for wisdom teeth.',          '{pano,panoramic}',                              false, 1, 60),
    ('D1110', 'PREVENTIVE',  'PREVENTIVE', 'Adult cleaning',                    'Routine professional teeth cleaning (prophylaxis).',                     '{cleaning,"teeth cleaning",prophy}',            false, 2, 12),
    ('D1206', 'PREVENTIVE',  'PREVENTIVE', 'Fluoride varnish',                  'A protective fluoride coating painted onto the teeth.',                  '{fluoride}',                                    false, 2, 12),
    ('D1351', 'PREVENTIVE',  'PREVENTIVE', 'Sealant (per tooth)',               'A thin protective coating on the chewing surface of a back tooth.',      '{sealant,sealants}',                            true,  1, 36),
    ('D2140', 'RESTORATIVE', 'BASIC',      'Amalgam filling, 1 surface',        'A silver-colored filling on one side of a tooth.',                       '{"silver filling",filling,cavity}',             true,  NULL, NULL),
    ('D2330', 'RESTORATIVE', 'BASIC',      'Composite filling, 1 surface (front)', 'A tooth-colored filling on one side of a front tooth.',               '{"white filling",filling,cavity}',              true,  NULL, NULL),
    ('D2391', 'RESTORATIVE', 'BASIC',      'Composite filling, 1 surface (back)',  'A tooth-colored filling on one side of a back tooth.',                '{"white filling",filling,cavity}',              true,  NULL, NULL),
    ('D2392', 'RESTORATIVE', 'BASIC',      'Composite filling, 2 surfaces (back)', 'A tooth-colored filling covering two sides of a back tooth.',         '{"white filling",filling,cavity}',              true,  NULL, NULL),
    ('D2740', 'RESTORATIVE', 'MAJOR',      'Crown, porcelain/ceramic',          'A full tooth-colored cap that covers and protects a damaged tooth.',     '{crown,cap,"porcelain crown"}',                 true,  1, 60),
    ('D2750', 'RESTORATIVE', 'MAJOR',      'Crown, porcelain fused to metal',   'A cap with a metal core and a porcelain outer layer.',                   '{crown,cap,pfm}',                               true,  1, 60),
    ('D2950', 'RESTORATIVE', 'MAJOR',      'Core buildup',                      'Rebuilds the inside of a broken-down tooth so a crown can hold on.',     '{buildup,"core build-up"}',                     true,  1, 60),
    ('D3310', 'ENDODONTICS', 'MAJOR',      'Root canal, front tooth',           'Removes infected nerve tissue from inside a front tooth.',               '{"root canal",endo}',                           true,  NULL, NULL),
    ('D3330', 'ENDODONTICS', 'MAJOR',      'Root canal, molar',                 'Removes infected nerve tissue from inside a back molar.',                '{"root canal",endo}',                           true,  NULL, NULL),
    ('D4341', 'PERIODONTICS','BASIC',      'Deep cleaning (per quadrant)',      'Scaling and root planing: cleans below the gum line to treat gum disease.', '{"deep cleaning",srp,"scaling and root planing"}', false, 1, 24),
    ('D4910', 'PERIODONTICS','BASIC',      'Periodontal maintenance',           'Ongoing gum-disease cleanings after a deep cleaning.',                   '{"perio maintenance","gum cleaning"}',          false, 4, 12),
    ('D6010', 'IMPLANT',     'MAJOR',      'Implant post',                      'A titanium post placed in the jaw to replace a missing tooth root.',      '{implant,"dental implant"}',                    true,  1, 60),
    ('D6065', 'IMPLANT',     'MAJOR',      'Implant crown, ceramic',            'The visible tooth-shaped crown that attaches to an implant.',            '{"implant crown"}',                             true,  1, 60),
    ('D7140', 'ORAL_SURGERY','BASIC',      'Simple extraction',                 'Removal of a tooth that is fully visible above the gum.',                '{extraction,"pull tooth","tooth removal"}',     true,  NULL, NULL),
    ('D7210', 'ORAL_SURGERY','BASIC',      'Surgical extraction',               'Removal of a tooth that needs the gum opened or bone removed.',          '{"surgical extraction"}',                       true,  NULL, NULL),
    ('D7240', 'ORAL_SURGERY','MAJOR',      'Wisdom tooth removal (impacted)',   'Removal of a wisdom tooth fully covered by bone.',                       '{"wisdom tooth","wisdom teeth",impacted}',      true,  NULL, NULL),
    ('D8090', 'ORTHODONTICS','ORTHODONTIC','Comprehensive orthodontics, adult', 'Full braces or clear-aligner treatment for adults.',                      '{braces,aligners,invisalign}',                  false, NULL, NULL),
    ('D9110', 'ADJUNCTIVE',  'BASIC',      'Emergency pain relief',             'Palliative emergency treatment to relieve dental pain.',                 '{"emergency visit","pain relief"}',             false, NULL, NULL),
    ('D9944', 'ADJUNCTIVE',  'MAJOR',      'Night guard (hard, full arch)',     'A custom guard worn at night to protect teeth from grinding.',           '{"night guard","mouth guard",grinding,bruxism}', false, 1, 36);

-- National fee schedule: (ucr_fee = typical out-of-network charge, in_network_fee = negotiated PPO fee)
INSERT INTO procedure_fees (cdt_code, region_code, ucr_fee, in_network_fee) VALUES
    ('D0120', 'NATIONAL',   75.00,   52.00),
    ('D0140', 'NATIONAL',  105.00,   72.00),
    ('D0150', 'NATIONAL',  120.00,   84.00),
    ('D0210', 'NATIONAL',  170.00,  115.00),
    ('D0274', 'NATIONAL',   85.00,   58.00),
    ('D0330', 'NATIONAL',  145.00,   98.00),
    ('D1110', 'NATIONAL',  125.00,   88.00),
    ('D1206', 'NATIONAL',   48.00,   32.00),
    ('D1351', 'NATIONAL',   62.00,   42.00),
    ('D2140', 'NATIONAL',  155.00,  105.00),
    ('D2330', 'NATIONAL',  180.00,  120.00),
    ('D2391', 'NATIONAL',  205.00,  135.00),
    ('D2392', 'NATIONAL',  255.00,  170.00),
    ('D2740', 'NATIONAL', 1375.00,  925.00),
    ('D2750', 'NATIONAL', 1275.00,  860.00),
    ('D2950', 'NATIONAL',  310.00,  205.00),
    ('D3310', 'NATIONAL',  925.00,  660.00),
    ('D3330', 'NATIONAL', 1325.00,  960.00),
    ('D4341', 'NATIONAL',  285.00,  195.00),
    ('D4910', 'NATIONAL',  165.00,  115.00),
    ('D6010', 'NATIONAL', 2450.00, 1750.00),
    ('D6065', 'NATIONAL', 1750.00, 1225.00),
    ('D7140', 'NATIONAL',  205.00,  140.00),
    ('D7210', 'NATIONAL',  360.00,  245.00),
    ('D7240', 'NATIONAL',  565.00,  390.00),
    ('D8090', 'NATIONAL', 6200.00, 5100.00),
    ('D9110', 'NATIONAL',  125.00,   88.00),
    ('D9944', 'NATIONAL',  615.00,  410.00);

-- A high-cost metro region derived from the national schedule.
INSERT INTO procedure_fees (cdt_code, region_code, ucr_fee, in_network_fee)
SELECT cdt_code, 'NYC_METRO', ROUND(ucr_fee * 1.35, 0), ROUND(in_network_fee * 1.30, 0)
FROM procedure_fees
WHERE region_code = 'NATIONAL';

-- Plan-specific rules
INSERT INTO plan_procedure_overrides (plan_id, cdt_code, coverage_class, is_excluded, notes) VALUES
    ('22222222-2222-4222-8222-000000000001', 'D6010', NULL,    true,  'Implants are excluded services on Core PPO.'),
    ('22222222-2222-4222-8222-000000000001', 'D6065', NULL,    true,  'Implant prosthetics are excluded services on Core PPO.'),
    ('22222222-2222-4222-8222-000000000001', 'D8090', NULL,    true,  'Orthodontics is not a covered benefit on Core PPO.'),
    ('22222222-2222-4222-8222-000000000002', 'D3310', 'BASIC', false, 'Premier PPO reimburses endodontics as Basic.'),
    ('22222222-2222-4222-8222-000000000002', 'D3330', 'BASIC', false, 'Premier PPO reimburses endodontics as Basic.'),
    ('22222222-2222-4222-8222-000000000003', 'D9944', NULL,    true,  'Occlusal guards are excluded on Freedom Indemnity.'),
    ('22222222-2222-4222-8222-000000000003', 'D8090', NULL,    true,  'Orthodontics is not a covered benefit on Freedom Indemnity.');

-- -----------------------------------------------------------------------------
-- 2026 enrollments (calendar-year benefit period)
-- -----------------------------------------------------------------------------
INSERT INTO plan_enrollments (id, user_id, plan_id, coverage_tier, region_code, plan_year_start, plan_year_end, rollover_balance) VALUES
    ('33333333-3333-4333-8333-000000000001', '11111111-1111-4111-8111-000000000001', '22222222-2222-4222-8222-000000000002', 'EMPLOYEE',        'NATIONAL', '2026-01-01', '2026-12-31', 250.00),
    ('33333333-3333-4333-8333-000000000002', '11111111-1111-4111-8111-000000000002', '22222222-2222-4222-8222-000000000001', 'EMPLOYEE_SPOUSE', 'NATIONAL', '2026-01-01', '2026-12-31',   0.00),
    ('33333333-3333-4333-8333-000000000003', '11111111-1111-4111-8111-000000000003', '22222222-2222-4222-8222-000000000003', 'FAMILY',          'NATIONAL', '2026-01-01', '2026-12-31',   0.00);

-- -----------------------------------------------------------------------------
-- Claims history
-- -----------------------------------------------------------------------------
INSERT INTO benefit_claims
    (enrollment_id, cdt_code, tooth_number, service_date, network_tier, billed_amount, allowed_amount, plan_paid, patient_paid, applied_to_deductible)
VALUES
    -- Maya / Premier PPO: two check-ups, a toothache that became a root canal on #19, a small filling.
    ('33333333-3333-4333-8333-000000000001', 'D0120', NULL, '2026-02-10', 'IN_NETWORK',   52.00,  52.00,  52.00,   0.00,  0.00),
    ('33333333-3333-4333-8333-000000000001', 'D1110', NULL, '2026-02-10', 'IN_NETWORK',   88.00,  88.00,  88.00,   0.00,  0.00),
    ('33333333-3333-4333-8333-000000000001', 'D0274', NULL, '2026-02-10', 'IN_NETWORK',   58.00,  58.00,  58.00,   0.00,  0.00),
    ('33333333-3333-4333-8333-000000000001', 'D0140', 19,   '2026-05-06', 'IN_NETWORK',   72.00,  72.00,  72.00,   0.00,  0.00),
    ('33333333-3333-4333-8333-000000000001', 'D3330', 19,   '2026-05-14', 'IN_NETWORK',  960.00, 960.00, 728.00, 232.00, 50.00),
    ('33333333-3333-4333-8333-000000000001', 'D2391', 3,    '2026-06-03', 'IN_NETWORK',  135.00, 135.00, 108.00,  27.00,  0.00),
    ('33333333-3333-4333-8333-000000000001', 'D0120', NULL, '2026-08-20', 'IN_NETWORK',   52.00,  52.00,  52.00,   0.00,  0.00),
    ('33333333-3333-4333-8333-000000000001', 'D1110', NULL, '2026-08-20', 'IN_NETWORK',   88.00,  88.00,  88.00,   0.00,  0.00),

    -- Jordan / Core PPO: one preventive visit; most of the maximum is untouched.
    ('33333333-3333-4333-8333-000000000002', 'D0120', NULL, '2026-03-02', 'IN_NETWORK',   52.00,  52.00,  52.00,   0.00,  0.00),
    ('33333333-3333-4333-8333-000000000002', 'D1110', NULL, '2026-03-02', 'IN_NETWORK',   88.00,  88.00,  88.00,   0.00,  0.00),

    -- Sam / Freedom Indemnity: trauma to #8 (root canal + crown) nearly exhausted the maximum.
    ('33333333-3333-4333-8333-000000000003', 'D0140', 8,    '2026-01-20', 'OUT_OF_NETWORK', 105.00,  105.00, 105.00,   0.00,  0.00),
    ('33333333-3333-4333-8333-000000000003', 'D3310', 8,    '2026-01-27', 'OUT_OF_NETWORK', 925.00,  925.00, 437.50, 487.50, 50.00),
    ('33333333-3333-4333-8333-000000000003', 'D2740', 8,    '2026-04-15', 'OUT_OF_NETWORK', 1375.00, 1375.00, 687.50, 687.50,  0.00),
    ('33333333-3333-4333-8333-000000000003', 'D0120', NULL, '2026-07-09', 'OUT_OF_NETWORK',  75.00,   75.00,  75.00,   0.00,  0.00),
    ('33333333-3333-4333-8333-000000000003', 'D1110', NULL, '2026-07-09', 'OUT_OF_NETWORK', 125.00,  125.00, 125.00,   0.00,  0.00);

-- -----------------------------------------------------------------------------
-- Maya's AI-sequenced treatment plan
-- -----------------------------------------------------------------------------
INSERT INTO treatment_plan_items
    (enrollment_id, cdt_code, tooth_number, surfaces, network_tier, status, urgency, recommended_date, sequence_order,
     estimated_fee, estimated_plan_pays, estimated_patient_pays, user_input_text, ai_rationale)
VALUES
    ('33333333-3333-4333-8333-000000000001', 'D2950', 19, NULL, 'IN_NETWORK', 'PROPOSED', 'SOON', '2026-11-12', 1,
     205.00, 102.50, 102.50,
     'My dentist says I need a crown on my lower left molar after the root canal.',
     'Tooth #19 had a root canal in May and needs a buildup before the crown. Your deductible is already met, so the plan pays 50%.'),
    ('33333333-3333-4333-8333-000000000001', 'D2740', 19, NULL, 'IN_NETWORK', 'PROPOSED', 'SOON', '2026-11-12', 2,
     925.00, 462.50, 462.50,
     'My dentist says I need a crown on my lower left molar after the root canal.',
     'Root-canal-treated molars can fracture without a crown. Doing it before Dec 31 uses $462.50 of your remaining 2026 maximum instead of starting 2027 with it.'),
    ('33333333-3333-4333-8333-000000000001', 'D2392', 30, 'MO', 'IN_NETWORK', 'PROPOSED', 'SOON', '2026-12-08', 3,
     170.00, 136.00, 34.00,
     'There is also a small cavity on my lower right molar.',
     'A two-surface filling is Basic (80%). Scheduling it in December still fits under your 2026 maximum after the crown.'),
    ('33333333-3333-4333-8333-000000000001', 'D1110', NULL, NULL, 'IN_NETWORK', 'PROPOSED', 'ELECTIVE', '2027-02-15', 4,
     88.00, 88.00, 0.00,
     'When should I get my next cleaning?',
     'You have used both 2026 cleanings (Feb and Aug). Your next one is covered at 100% once the 2027 benefit period starts.');
