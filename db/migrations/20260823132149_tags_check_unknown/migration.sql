ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_value_matches_kind;

ALTER TABLE tags
  ADD CONSTRAINT tags_value_matches_kind CHECK (
    (kind <> 'scope' OR value IN ('pan_tunisian', 'regional'))
    AND (kind <> 'region' OR value IN ('northwest', 'north', 'sahel', 'south'))
    AND (kind <> 'era' OR value IN ('contemporary', 'historical', 'unknown'))
    AND (kind <> 'setting' OR value IN ('urban', 'rural', 'unknown'))
    AND (kind <> 'register' OR value IN ('neutral', 'formal', 'vulgar', 'archaic', 'unknown'))
  );
