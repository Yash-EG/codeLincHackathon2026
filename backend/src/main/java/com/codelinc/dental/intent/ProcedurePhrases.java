package com.codelinc.dental.intent;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static java.util.Map.entry;

/**
 * Everyday ways people name the procedures in the catalog, mapped to the catalog's canonical names
 * ({@code procedures.name}: Exam, X-Ray, Cleaning, Filling, Extraction, Deep Cleaning, Root Canal,
 * Crown, Implant).
 *
 * <p>Used in two places: the procedure resolver, so "root canals", "a porcelain crown" or
 * "tooth removal" resolve instead of coming back unknown, and the keyword fallback that reads a
 * question when Bedrock is unavailable. It only ever names a catalog procedure; prices and coverage
 * still come from the database.
 */
public final class ProcedurePhrases {

    /** Lower-case phrase to canonical catalog name. Canonical names map to themselves. */
    public static final Map<String, String> PHRASES = Map.ofEntries(
            entry("exam", "Exam"),
            entry("checkup", "Exam"),
            entry("check-up", "Exam"),
            entry("check up", "Exam"),
            entry("dental exam", "Exam"),
            entry("oral exam", "Exam"),
            entry("x-ray", "X-Ray"),
            entry("x ray", "X-Ray"),
            entry("xray", "X-Ray"),
            entry("radiograph", "X-Ray"),
            entry("bitewing", "X-Ray"),
            entry("cleaning", "Cleaning"),
            entry("teeth cleaning", "Cleaning"),
            entry("cleaning teeth", "Cleaning"),
            entry("prophy", "Cleaning"),
            entry("prophylaxis", "Cleaning"),
            entry("deep cleaning", "Deep Cleaning"),
            entry("scaling and root planing", "Deep Cleaning"),
            entry("scaling", "Deep Cleaning"),
            entry("periodontal cleaning", "Deep Cleaning"),
            entry("filling", "Filling"),
            entry("cavity filling", "Filling"),
            entry("cavity", "Filling"),
            entry("cavities", "Filling"),
            entry("extraction", "Extraction"),
            entry("tooth removal", "Extraction"),
            entry("pulling a tooth", "Extraction"),
            entry("pull a tooth", "Extraction"),
            entry("tooth pulled", "Extraction"),
            entry("wisdom tooth", "Extraction"),
            entry("root canal", "Root Canal"),
            entry("root canal therapy", "Root Canal"),
            entry("endodontic treatment", "Root Canal"),
            entry("crown", "Crown"),
            entry("cap", "Crown"),
            entry("implant", "Implant"),
            entry("dental implant", "Implant"));

    /** Longest phrases first, so "deep cleaning" wins over "cleaning" and "root canal therapy" over "root canal". */
    private static final List<Map.Entry<String, Pattern>> PATTERNS = PHRASES.keySet().stream()
            .sorted(Comparator.comparingInt(String::length).reversed().thenComparing(Comparator.naturalOrder()))
            .map(p -> Map.entry(p, Pattern.compile(
                    // Whole words only (so "cap" never matches "capacitor"), with an optional plural.
                    "(?<![a-z0-9])" + Pattern.quote(p) + "(?:s|es)?(?![a-z0-9])")))
            .toList();

    private ProcedurePhrases() {
    }

    /** The canonical name for an exact phrase (any case, surrounding spaces ignored), if it is one we know. */
    public static Optional<String> canonical(String phrase) {
        if (phrase == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(PHRASES.get(phrase.trim().toLowerCase(Locale.ROOT)));
    }

    /**
     * Every catalog procedure named in free text, in the order they appear. Where phrases overlap the
     * longest one wins, so "two deep cleanings" finds Deep Cleaning only, not Cleaning as well.
     */
    public static Set<String> findIn(String text) {
        if (text == null || text.isBlank()) {
            return Set.of();
        }
        String lower = text.toLowerCase(Locale.ROOT);
        List<int[]> taken = new ArrayList<>();
        List<Map.Entry<Integer, String>> found = new ArrayList<>();
        for (Map.Entry<String, Pattern> e : PATTERNS) {
            Matcher m = e.getValue().matcher(lower);
            while (m.find()) {
                int start = m.start(), end = m.end();
                boolean overlaps = taken.stream().anyMatch(t -> start < t[1] && end > t[0]);
                if (!overlaps) {
                    taken.add(new int[]{start, end});
                    found.add(Map.entry(start, PHRASES.get(e.getKey())));
                }
            }
        }
        found.sort(Map.Entry.comparingByKey());
        Set<String> names = new LinkedHashSet<>();
        found.forEach(f -> names.add(f.getValue()));
        return names;
    }
}
