// Stammdaten: Fragen, Übungen, Splits und Belastungsschemata

export const QUESTIONS = [
  { f: "goal", q: "Was ist dein Ziel?", o: [
    ["fitness", "Fitter werden", "Kraft, Muskeln und Kondition ausgewogen"],
    ["muskel", "Muskelaufbau", "Mehr Muskelmasse, moderates Gewicht"],
    ["kraft", "Maximalkraft", "Schwer, wenige Wiederholungen"],
    ["abnehmen", "Abnehmen", "Kurze Pausen, extra Cardio"],
    ["ausdauer", "Ausdauer", "Kraftausdauer und Cardio-Einheiten"]] },
  { f: "focus", q: "Welcher Bereich soll mehr trainiert werden?", o: [
    ["ober", "Oberkörper", "Brust, Rücken, Schultern und Arme bekommen mehr Einheiten"],
    ["aus", "Ausgewogen", "Ganzer Körper gleichmäßig"],
    ["unter", "Unterkörper", "Beine und Po bekommen mehr Einheiten"]] },
  { f: "level", q: "Wie viel Trainingserfahrung hast du?", o: [
    ["1", "Anfänger", "Wenig oder keine Erfahrung mit Krafttraining"],
    ["2", "Fortgeschritten", "Mehr als ein halbes Jahr regelmäßig trainiert"],
    ["3", "Erfahren", "Mehrere Jahre, sichere Technik"]] },
  { f: "days", q: "An wie vielen Tagen pro Woche willst du trainieren?", o: [
    ["2", "2 Tage", "Minimum bei wenig Zeit"], ["3", "3 Tage", "Gut für den Einstieg"], ["4", "4 Tage", "Mehr Volumen, gute Balance"],
    ["5", "5 Tage", "Mit etwas Erfahrung"], ["6", "6 Tage", "Nur mit viel Erfahrung"]] },
  { f: "time", q: "Wie lange soll eine Einheit dauern?", o: [
    ["30", "30 Minuten", "4 Übungen"], ["45", "45 Minuten", "5 Übungen"], ["60", "60 Minuten", "6 Übungen"], ["75", "75 Minuten", "7 Übungen"]] },
  { f: "tools", multi: true, q: "Welche Trainingsgeräte hast du?", h: "Mehrfachauswahl. Übungen mit dem eigenen Körpergewicht sind immer dabei.", o: [
    ["kb", "Kettlebell", ""], ["stange", "Klimmzugstange", ""], ["kh", "Kurzhanteln", ""], ["lh", "Langhantel mit Ablage", ""],
    ["bank", "Hantelbank", ""], ["band", "Widerstandsband", ""], ["kabel", "Kabelzug", "Im Fitnessstudio"],
    ["masch", "Kraftmaschinen", "Beinpresse, Beinbeuger"], ["seil", "Springseil", ""], ["cardio", "Cardiogerät", "Laufband, Rad, Rudergerät"]] },
];

export const DEFAULT = { goal: "fitness", focus: "ober", level: "1", days: "4", time: "60", tools: ["kb", "stange"] };

export const label = (f, v) => (QUESTIONS.find(q => q.f === f).o.find(o => o[0] === v) || [, v])[1];

// Übungen: p = Bewegungsmuster, t = benötigte Geräte (leer = Körpergewicht), lvl = Schwierigkeit,
// u = "s" für Haltezeit, side = pro Seite, a = Animation der Vorlage, c = wichtigster Hinweis, s = Ablauf
export const EX = [
  { id: "lh-squat", n: "Kniebeuge (Langhantel)", p: "squat", t: ["lh"], lvl: 2, a: "backsquat", c: "Knie folgen den Zehen, Fersen bleiben am Boden.",
    s: ["Stange auf den oberen Rücken legen, Füße schulterbreit.", "Hüfte nach hinten unten sinken lassen, bis die Oberschenkel parallel sind.", "Über die ganze Fußsohle kraftvoll aufrichten."] },
  { id: "kh-goblet", n: "Goblet Squat (Kurzhantel)", p: "squat", t: ["kh"], lvl: 1, a: "goblet", c: "Ellbogen zwischen die Knie, Brust bleibt oben.",
    s: ["Kurzhantel senkrecht vor der Brust halten.", "Tief in die Hocke setzen, Rücken gerade.", "Durch die Fersen hochdrücken."] },
  { id: "kb-goblet", n: "Kettlebell Goblet Squat", p: "squat", t: ["kb"], lvl: 1, a: "goblet", c: "Ellbogen zwischen die Knie, Brust bleibt oben.",
    s: ["Kettlebell an den Hörnern vor der Brust halten, Füße etwas breiter als die Schultern.", "Tief in die Hocke setzen, Fersen bleiben am Boden.", "Durch die Fersen hochdrücken und oben den Po anspannen."] },
  { id: "kb-front", n: "Kettlebell Front Squat", p: "squat", t: ["kb"], lvl: 2, a: "goblet", side: true, c: "Oberkörper bleibt aufrecht, nicht zur Kettlebell-Seite kippen.",
    s: ["Kettlebell in Rack-Position: am Unterarm vor der Schulter.", "Kontrolliert tief in die Hocke gehen.", "Kraftvoll aufrichten, nach dem Satz die Seite wechseln."] },
  { id: "legpress", n: "Beinpresse", p: "squat", t: ["masch"], lvl: 1, a: "squat", prop: null, c: "Unterer Rücken bleibt am Polster.",
    s: ["Füße schulterbreit mittig auf die Platte.", "Langsam ablassen, bis die Knie etwa 90° gebeugt sind.", "Hochdrücken, ohne die Knie ganz durchzustrecken."] },
  { id: "bw-squat", n: "Kniebeuge (Körpergewicht)", p: "squat", t: [], lvl: 1, a: "squat", c: "Langsam runter, explosiv hoch.",
    s: ["Füße schulterbreit, Arme nach vorne strecken.", "In 3 Sekunden tief in die Hocke gehen.", "Schnell aufrichten, oben kurz stehen bleiben."] },
  { id: "bss", n: "Bulgarian Split Squat", p: "squat", t: [], lvl: 2, a: "lunge", side: true, c: "Das Gewicht liegt auf dem vorderen Bein.",
    s: ["Hinteren Fuß auf einen Stuhl legen, vorderer Fuß weit vorn.", "Hinteres Knie Richtung Boden absenken.", "Über die vordere Ferse hochdrücken."] },

  { id: "deadlift", n: "Kreuzheben", p: "hinge", t: ["lh"], lvl: 2, a: "hinge", c: "Rücken bleibt neutral, Stange nah am Körper.",
    s: ["Stange über der Fußmitte, schulterbreit greifen.", "Brust raus, Rücken gerade, Spannung aufbauen.", "Hüfte und Schultern steigen gleichzeitig, oben aufrecht stehen."] },
  { id: "kh-rdl", n: "Kurzhantel-RDL", p: "hinge", t: ["kh"], lvl: 1, a: "hinge", c: "Hüfte nach hinten schieben, Knie nur leicht beugen.",
    s: ["Aufrecht stehen, Hanteln vor den Oberschenkeln.", "Hüfte nach hinten, Hanteln eng an den Beinen bis unter die Knie.", "Hüfte nach vorn schieben und aufrichten."] },
  { id: "kb-swing", n: "Kettlebell Swing", p: "hinge", t: ["kb"], lvl: 1, a: "swing", c: "Der Schwung kommt aus der Hüfte, nicht aus den Armen.",
    s: ["Kettlebell mit beiden Händen greifen, zwischen die Beine zurückschwingen.", "Hüfte explosiv nach vorn strecken, Po fest anspannen.", "Die Kettlebell schwebt bis Brusthöhe, dann wieder zwischen die Beine."] },
  { id: "kb-dl", n: "Kettlebell Kreuzheben", p: "hinge", t: ["kb"], lvl: 1, a: "hinge", c: "Rücken gerade, die Kraft kommt aus der Hüfte.",
    s: ["Kettlebell zwischen den Füßen, Hüfte nach hinten.", "Griff fassen, Brust raus, Schultern nach hinten.", "Hüfte nach vorn schieben und aufrecht stehen."] },
  { id: "kb-slrdl", n: "Einbeiniges Kettlebell-RDL", p: "hinge", t: ["kb"], lvl: 2, a: "hinge", side: true, c: "Becken bleibt gerade, nicht aufdrehen.",
    s: ["Auf einem Bein stehen, Kettlebell in der Gegenhand.", "Oberkörper nach vorn neigen, freies Bein nach hinten strecken.", "Langsam wieder aufrichten."] },
  { id: "bridge", n: "Glute Bridge", p: "hinge", t: [], lvl: 1, a: "bridge", c: "Oben 1 Sekunde halten, Po fest anspannen.",
    s: ["Auf den Rücken legen, Füße nah am Gesäß aufstellen.", "Hüfte hochdrücken, bis Knie, Hüfte und Schultern eine Linie bilden.", "Langsam ablegen."] },

  { id: "lunge", n: "Ausfallschritte", p: "lunge", t: [], lvl: 1, a: "lunge", side: true, c: "Oberkörper bleibt aufrecht.",
    s: ["Aufrecht stehen, Hände in die Hüfte.", "Großer Schritt nach hinten, hinteres Knie Richtung Boden.", "Über das vordere Bein zurück in den Stand."] },
  { id: "kb-lunge", n: "Kettlebell Rückwärts-Ausfallschritte", p: "lunge", t: ["kb"], lvl: 1, a: "lunge", side: true, c: "Vorderes Knie bleibt über dem Fuß.",
    s: ["Kettlebell vor der Brust oder seitlich halten.", "Großer Schritt nach hinten, hinteres Knie fast bis zum Boden.", "Über die vordere Ferse zurück in den Stand."] },
  { id: "stepup", n: "Step-ups", p: "lunge", t: [], lvl: 1, a: "lunge", side: true, c: "Nicht mit dem unteren Bein abstoßen.",
    s: ["Vor eine stabile Stufe oder einen Stuhl stellen.", "Einen Fuß komplett aufsetzen und hochsteigen.", "Kontrolliert wieder absteigen."] },

  { id: "legcurl", n: "Beinbeuger (Maschine)", p: "legcurl", t: ["masch"], lvl: 1, a: "legcurl", c: "Hüfte bleibt am Polster.",
    s: ["Polster knapp über den Fersen einstellen.", "Fersen Richtung Po ziehen.", "Langsam zurückführen."] },
  { id: "slider", n: "Beincurl mit Handtuch", p: "legcurl", t: [], lvl: 1, a: "legcurl", c: "Hüfte bleibt die ganze Zeit oben.",
    s: ["Rückenlage, Fersen auf einem Handtuch auf glattem Boden.", "Hüfte anheben und Fersen zum Po ziehen.", "Beine langsam wieder ausstrecken."] },

  { id: "bench", n: "Bankdrücken (Langhantel)", p: "hpush", t: ["lh", "bank"], lvl: 2, a: "bench", c: "Schulterblätter zusammen, Füße fest am Boden.",
    s: ["Auf die Bank legen, Stange etwas breiter als schulterbreit greifen.", "Kontrolliert zur unteren Brust absenken.", "Kraftvoll nach oben drücken."] },
  { id: "kh-bench", n: "Kurzhantel-Bankdrücken", p: "hpush", t: ["kh", "bank"], lvl: 1, a: "bench", c: "Ellbogen etwa 45° zum Körper.",
    s: ["Auf die Bank legen, Hanteln über der Brust.", "Ablassen, bis die Hanteln neben der Brust sind.", "Nach oben drücken und leicht zusammenführen."] },
  { id: "kb-floor", n: "Kettlebell Floor Press", p: "hpush", t: ["kb"], lvl: 1, a: "floorpress", side: true, c: "Handgelenk gerade, Kettlebell liegt auf dem Unterarm.",
    s: ["Rückenlage, Knie aufgestellt, Kettlebell neben der Brust greifen.", "Senkrecht nach oben drücken, bis der Arm gestreckt ist.", "Ablassen, bis der Oberarm kurz den Boden berührt."] },
  { id: "pushup", n: "Liegestütze", p: "hpush", t: [], lvl: 1, a: "pushup", c: "Körper bildet eine gerade Linie. Zu schwer? Hände erhöht aufstützen.",
    s: ["Hände etwas breiter als schulterbreit, Körper gestreckt.", "Brust bis knapp über den Boden absenken, Ellbogen schräg nach hinten.", "Kraftvoll hochdrücken."] },
  { id: "pushup-dec", n: "Liegestütze mit erhöhten Füßen", p: "hpush", t: [], lvl: 2, a: "pushup", c: "Bauch fest, kein Durchhängen.",
    s: ["Füße auf einen Stuhl, Hände am Boden.", "Brust kontrolliert absenken.", "Hochdrücken, bis die Arme gestreckt sind."] },
  { id: "dips", n: "Dips (zwischen zwei Stühlen)", p: "hpush", t: [], lvl: 2, a: "dip", c: "Schultern bleiben unten, weg von den Ohren.",
    s: ["Zwischen zwei stabile Stühle stützen, Arme gestreckt.", "Absenken, bis die Oberarme parallel zum Boden sind.", "Wieder hochdrücken."] },

  { id: "ohp", n: "Schulterdrücken (Langhantel)", p: "vpush", t: ["lh"], lvl: 2, a: "press", c: "Po und Bauch fest, kein Hohlkreuz.",
    s: ["Stange vor den Schultern, Ellbogen leicht vorn.", "Senkrecht über den Kopf drücken.", "Kontrolliert zurück zu den Schultern."] },
  { id: "kh-ohp", n: "Kurzhantel-Schulterdrücken", p: "vpush", t: ["kh"], lvl: 1, a: "press", c: "Kein Hohlkreuz.",
    s: ["Hanteln auf Schulterhöhe, Handflächen nach vorn.", "Über den Kopf drücken.", "Langsam zurück auf Schulterhöhe."] },
  { id: "kb-press", n: "Kettlebell Schulterdrücken", p: "vpush", t: ["kb"], lvl: 1, a: "press", side: true, c: "Bauch fest, Oberkörper nicht zur Seite lehnen.",
    s: ["Kettlebell in Rack-Position vor der Schulter.", "Senkrecht über den Kopf drücken, Arm neben dem Ohr.", "Kontrolliert zurück in die Rack-Position."] },
  { id: "kb-pushpress", n: "Kettlebell Push Press", p: "vpush", t: ["kb"], lvl: 2, a: "press", side: true, c: "Erst Beine, dann Arm.",
    s: ["Kettlebell in Rack-Position.", "Kurz in die Knie gehen und explosiv strecken.", "Den Schwung nutzen und über Kopf drücken."] },
  { id: "pike", n: "Pike Push-ups", p: "vpush", t: [], lvl: 1, a: "pike", c: "Hüfte bleibt hoch, Kopf zwischen die Hände.",
    s: ["Umgekehrtes V: Hände und Füße am Boden, Po nach oben.", "Ellbogen beugen, Kopf Richtung Boden.", "Wieder hochdrücken."] },

  { id: "lh-row", n: "Langhantelrudern", p: "hpull", t: ["lh"], lvl: 2, a: "row", c: "Rücken gerade, Stange zum Bauchnabel.",
    s: ["Oberkörper etwa 45° vorneigen, Knie leicht gebeugt.", "Stange zum Bauchnabel ziehen.", "Kontrolliert ablassen."] },
  { id: "kh-row", n: "Einarmiges Kurzhantelrudern", p: "hpull", t: ["kh"], lvl: 1, a: "row", side: true, c: "Ellbogen zur Hüfte ziehen.",
    s: ["Eine Hand auf Bank oder Knie stützen.", "Hantel zur Hüfte ziehen.", "Langsam ablassen."] },
  { id: "kb-row", n: "Einarmiges Kettlebell-Rudern", p: "hpull", t: ["kb"], lvl: 1, a: "row", side: true, c: "Ellbogen zur Hüfte, nicht zur Schulter ziehen.",
    s: ["Eine Hand auf einen Stuhl stützen, Rücken gerade.", "Kettlebell zur Hüfte ziehen, oben Schulterblatt nach hinten.", "Langsam ablassen, bis der Arm gestreckt ist."] },
  { id: "kb-gorilla", n: "Kettlebell Gorilla Row", p: "hpull", t: ["kb"], lvl: 2, a: "row", side: true, c: "Hüfte bleibt ruhig, nicht aufdrehen.",
    s: ["Breiter Stand, Oberkörper tief vorgebeugt.", "Kettlebell zur Hüfte ziehen.", "Ablassen und die Seite wechseln."] },
  { id: "cable-row", n: "Kabelrudern sitzend", p: "hpull", t: ["kabel"], lvl: 1, a: "row", c: "Schulterblätter zuerst zurückziehen.",
    s: ["Aufrecht sitzen, Griff mit gestreckten Armen.", "Griff zum Bauch ziehen.", "Arme langsam strecken."] },
  { id: "band-row", n: "Rudern mit Band", p: "hpull", t: ["band"], lvl: 1, a: "row", c: "Ellbogen nah am Körper.",
    s: ["Band in Brusthöhe an der Tür fixieren.", "Band zum Bauch ziehen.", "Langsam nachgeben."] },
  { id: "inv-row", n: "Tischrudern", p: "hpull", t: [], lvl: 1, a: "invrow", c: "Körper bleibt gestreckt wie ein Brett.",
    s: ["Unter einen stabilen Tisch legen, Tischkante greifen.", "Brust zur Tischkante ziehen.", "Langsam ablassen."] },

  { id: "pullup", n: "Klimmzüge", p: "vpull", t: ["stange"], lvl: 2, a: "pullup", c: "Aus dem toten Hang, ohne Schwung.",
    s: ["Stange schulterbreit im Obergriff fassen.", "Brust zur Stange ziehen, bis das Kinn darüber ist.", "Kontrolliert ganz ablassen."] },
  { id: "neg-pullup", n: "Negativ-Klimmzüge", p: "vpull", t: ["stange"], lvl: 1, a: "pullup", c: "Das Ablassen dauert 4–5 Sekunden.",
    s: ["Mit Sprung oder Stuhl in die obere Position, Kinn über der Stange.", "So langsam wie möglich ablassen.", "Unten loslassen und neu starten."] },
  { id: "latpull", n: "Latzug", p: "vpull", t: ["kabel"], lvl: 1, a: "latpull", c: "Stange zur oberen Brust, nicht in den Nacken.",
    s: ["Aufrecht sitzen, Stange breit greifen.", "Stange zur oberen Brust ziehen.", "Kontrolliert nach oben führen."] },
  { id: "kb-pullover", n: "Kettlebell Pullover", p: "vpull", t: ["kb"], lvl: 1, a: "pullover", c: "Arme leicht gebeugt, Rücken bleibt am Boden.",
    s: ["Rückenlage, Kettlebell über der Brust halten.", "Mit fast gestreckten Armen hinter den Kopf führen.", "Zurück über die Brust ziehen."] },
  { id: "band-pull", n: "Latziehen mit Band", p: "vpull", t: ["band"], lvl: 1, a: "latpull", c: "Ellbogen nach unten zur Hüfte.",
    s: ["Band oben an der Tür fixieren, knien.", "Ellbogen nach unten ziehen.", "Langsam nachgeben."] },
  { id: "superman", n: "Superman-Latzüge am Boden", p: "vpull", t: [], lvl: 1, a: "superman", c: "Blick zum Boden, Nacken lang.",
    s: ["Bauchlage, Arme nach vorn gestreckt, leicht abheben.", "Ellbogen in W-Form zur Hüfte ziehen, 2 Sekunden halten.", "Arme wieder nach vorn strecken."] },

  { id: "lateral", n: "Seitheben", p: "shoulder", t: ["kh"], lvl: 1, a: "raise", c: "Nur bis Schulterhöhe, kein Schwung.",
    s: ["Aufrecht stehen, Hanteln seitlich.", "Arme seitlich bis Schulterhöhe heben.", "Langsam senken."] },
  { id: "facepull", n: "Face Pulls", p: "shoulder", t: ["kabel"], lvl: 1, a: "row", c: "Hände am Ende auseinanderziehen.",
    s: ["Seil am Kabelzug auf Kopfhöhe.", "Seil zur Stirn ziehen, Ellbogen hoch.", "Langsam zurück."] },
  { id: "kb-halo", n: "Kettlebell Halo", p: "shoulder", t: ["kb"], lvl: 1, a: "raise", c: "Kettlebell eng um den Kopf führen, Bauch fest.",
    s: ["Kettlebell kopfüber an den Hörnern vor der Brust.", "Eng um den Kopf kreisen.", "Wiederholungen pro Richtung zählen."] },
  { id: "band-pa", n: "Band Pull-aparts", p: "shoulder", t: ["band"], lvl: 1, a: "raise", c: "Schulterblätter zusammenziehen.",
    s: ["Band schulterbreit vor der Brust greifen.", "Band auseinanderziehen, bis es die Brust berührt.", "Langsam zurück."] },
  { id: "ytw", n: "Y-T-W Raises", p: "shoulder", t: [], lvl: 1, a: "superman", c: "Kleine, kontrollierte Bewegungen.",
    s: ["Bauchlage, Stirn auf einem Handtuch.", "Arme als Y, T und W anheben, je 5 Wiederholungen.", "Oben jeweils kurz halten."] },

  { id: "kh-curl", n: "Kurzhantel-Curls", p: "biceps", t: ["kh"], lvl: 1, a: "curl", c: "Ellbogen bleiben am Körper.",
    s: ["Aufrecht stehen, Hanteln seitlich.", "Hanteln zur Schulter beugen.", "Langsam ablassen."] },
  { id: "kb-curl", n: "Kettlebell Curls", p: "biceps", t: ["kb"], lvl: 1, a: "curl", c: "Ohne Schwung aus dem Rücken.",
    s: ["Kettlebell an den Hörnern greifen, Arme gestreckt.", "Zur Brust beugen, Ellbogen bleiben am Körper.", "Langsam ablassen."] },
  { id: "kb-hammer", n: "Kettlebell Hammer Curls", p: "biceps", t: ["kb"], lvl: 1, a: "curl", side: true, c: "Daumen zeigt nach oben.",
    s: ["Kettlebell am Griff, Handfläche zum Körper.", "Zur Schulter beugen.", "Langsam ablassen."] },
  { id: "band-curl", n: "Bizepscurls mit Band", p: "biceps", t: ["band"], lvl: 1, a: "curl", c: "Oben kurz halten.",
    s: ["Auf das Band stellen, Enden greifen.", "Hände zur Schulter beugen.", "Langsam nachgeben."] },
  { id: "chinup", n: "Chin-ups", p: "biceps", t: ["stange"], lvl: 2, a: "pullup", c: "Untergriff, ohne Schwung.",
    s: ["Stange schulterbreit im Untergriff fassen.", "Kinn über die Stange ziehen.", "Kontrolliert ablassen."] },
  { id: "inv-row-ug", n: "Tischrudern Untergriff", p: "biceps", t: [], lvl: 1, a: "invrow", c: "Untergriff, Ellbogen nah am Körper.",
    s: ["Unter einen Tisch legen, Kante im Untergriff fassen.", "Brust zur Kante ziehen.", "Langsam ablassen."] },

  { id: "pushdown", n: "Trizepsdrücken am Kabel", p: "triceps", t: ["kabel"], lvl: 1, a: "pushdown", c: "Oberarme bleiben am Körper.",
    s: ["Griff vor der Brust, Ellbogen am Körper.", "Unterarme nach unten strecken.", "Langsam zurück."] },
  { id: "kh-ext", n: "Überkopf-Trizepsstrecken (Kurzhantel)", p: "triceps", t: ["kh"], lvl: 1, a: "ohext", c: "Ellbogen zeigen nach vorn.",
    s: ["Hantel mit beiden Händen über dem Kopf.", "Hinter den Kopf absenken.", "Arme wieder strecken."] },
  { id: "kb-ext", n: "Kettlebell Überkopf-Trizepsstrecken", p: "triceps", t: ["kb"], lvl: 1, a: "ohext", c: "Ellbogen bleiben nah am Kopf.",
    s: ["Kettlebell an den Hörnern über den Kopf heben.", "Hinter den Kopf absenken, Oberarme bleiben senkrecht.", "Arme wieder strecken."] },
  { id: "benchdip", n: "Stuhldips", p: "triceps", t: [], lvl: 1, a: "dip", c: "Schultern unten, Rücken nah am Stuhl.",
    s: ["Hände an die Stuhlkante, Füße vor dem Körper.", "Po absenken, bis die Ellbogen 90° gebeugt sind.", "Wieder hochdrücken."] },
  { id: "diamond", n: "Diamond Push-ups", p: "triceps", t: [], lvl: 2, a: "pushup", c: "Ellbogen bleiben nah am Körper.",
    s: ["Hände bilden ein Dreieck unter der Brust.", "Brust zu den Händen absenken.", "Hochdrücken."] },

  { id: "plank", n: "Unterarmstütz", p: "core", t: [], lvl: 1, u: "s", a: "plank", c: "Po fest, ruhig weiteratmen.",
    s: ["Unterarme unter die Schultern, Beine gestreckt.", "Körper bildet eine Linie, Bauch und Po fest.", "Position halten, gleichmäßig atmen."] },
  { id: "deadbug", n: "Dead Bug", p: "core", t: [], lvl: 1, a: "deadbug", c: "Unterer Rücken bleibt am Boden.",
    s: ["Rückenlage, Arme nach oben, Knie über der Hüfte.", "Gegenüberliegenden Arm und Bein langsam ausstrecken.", "Zurück und Seite wechseln."] },
  { id: "sideplank", n: "Seitstütz", p: "core", t: [], lvl: 1, u: "s", side: true, a: "plank", c: "Hüfte hoch, nicht absacken.",
    s: ["Seitlich auf den Unterarm stützen.", "Hüfte heben, Körper bildet eine Linie.", "Halten, dann Seite wechseln."] },
  { id: "kb-carry", n: "Kettlebell Suitcase Carry", p: "core", t: ["kb"], lvl: 1, u: "s", side: true, a: "carry", c: "Oberkörper bleibt gerade, nicht zur Seite kippen.",
    s: ["Kettlebell seitlich in einer Hand.", "Aufrecht und langsam gehen.", "Nach der Zeit die Seite wechseln."] },
  { id: "pallof", n: "Pallof Press", p: "core", t: ["kabel"], lvl: 1, a: "pallof", c: "Gegen die Drehung stabilisieren.",
    s: ["Seitlich zum Kabelzug, Griff vor der Brust.", "Arme nach vorn strecken.", "Zurück zur Brust."] },
  { id: "deadhang", n: "Toter Hang", p: "core", t: ["stange"], lvl: 1, u: "s", a: "hang", c: "Schultern aktiv nach unten ziehen.",
    s: ["Stange schulterbreit fassen.", "Hängen lassen, Schultern weg von den Ohren.", "Ruhig atmen und halten."] },
  { id: "legraise", n: "Hängendes Beinheben", p: "core", t: ["stange"], lvl: 2, a: "legraise", c: "Becken einrollen, kein Schwung.",
    s: ["An die Stange hängen.", "Knie zur Brust ziehen.", "Langsam ablassen."] },

  { id: "calf", n: "Wadenheben stehend", p: "calves", t: [], lvl: 1, a: "calf", c: "Oben 1 Sekunde halten.",
    s: ["Mit den Fußballen auf eine Stufe stellen.", "So hoch wie möglich auf die Zehen.", "Fersen unter die Stufe absenken."] },
  { id: "kb-calf", n: "Einbeiniges Wadenheben mit Kettlebell", p: "calves", t: ["kb"], lvl: 1, a: "calf", side: true, c: "Volle Bewegung, oben halten.",
    s: ["Auf einem Bein auf eine Stufe, Kettlebell in einer Hand.", "Auf die Zehenspitzen drücken.", "Langsam absenken."] },
];

export const FINISHERS = [
  { t: ["kb"], x: "Kettlebell Swings EMOM 8 min: 12 Swings zu Beginn jeder Minute" },
  { t: [], x: "Zirkel 3 Runden: 10 Burpees, 20 Mountain Climbers, 30 s Hampelmänner" },
  { t: ["kb"], x: "Kettlebell-Zirkel 3 Runden: 10 Goblet Squats, 10 Swings, 10 Liegestütze" },
  { t: ["seil"], x: "Seilspringen 8 × 40 s / 20 s Pause" },
  { t: ["cardio"], x: "Cardiogerät: 8 × 30 s zügig / 30 s locker" },
  { t: [], x: "Tabata Hampelmänner und Kniebeugen im Wechsel: 8 × 20 s / 10 s" },
];

export const WARMUP = ["2 min Hampelmänner oder auf der Stelle laufen", "10 × Armkreisen vorwärts und rückwärts", "10 Kniebeugen ohne Gewicht", "10 × Hüftkreisen pro Richtung", "10 Liegestütze, notfalls auf den Knien"];

// Cardio-Einheiten, skaliert auf die gewählte Dauer (t in Minuten)
export const CARDIO = {
  z2: { n: "Zone-2-Ausdauer", run: (w, t) => Math.round(t * [.6, .7, .8, .5][w] / 5) * 5,
    items: (w, t) => [`Laufen, Radfahren oder zügig Gehen: ${CARDIO.z2.run(w, t)} min locker`, "Puls bei ca. 60–70 % HFmax, Unterhaltung muss möglich sein", "Mobilität 5 min: Hüfte, Brustwirbelsäule"] },
  hiit: { n: "Intervalle", reps: (w, t) => Math.max(3, Math.round((t - 15) / 4 * [.8, .9, 1, .6][w])),
    items: (w, t) => ["Einlaufen 10 min locker", `${CARDIO.hiit.reps(w, t)} × 2 min zügig / 2 min locker`, "Auslaufen 5 min"] },
};

export const TEMPLATES = {
  A: { n: "Ganzkörper A", s: ["squat", "hpush", "hpull", "hinge", "shoulder", "core", "triceps", "calves"] },
  B: { n: "Ganzkörper B", s: ["hinge", "vpush", "vpull", "lunge", "biceps", "core", "shoulder", "calves"] },
  C: { n: "Ganzkörper C", s: ["squat", "hpush", "vpull", "legcurl", "shoulder", "core", "biceps", "triceps"] },
  G: { n: "Ganzkörper", s: ["hinge", "hpush", "hpull", "squat", "vpush", "core", "biceps", "triceps"] },
  O: { n: "Oberkörper", s: ["hpush", "hpull", "vpush", "vpull", "biceps", "triceps", "shoulder", "core"] },
  U: { n: "Unterkörper", s: ["squat", "hinge", "lunge", "legcurl", "calves", "core", "core"] },
  P: { n: "Push", s: ["hpush", "vpush", "hpush", "shoulder", "triceps", "triceps", "core"] },
  Z: { n: "Pull", s: ["vpull", "hpull", "hpull", "shoulder", "biceps", "biceps", "core"] },
  L: { n: "Beine", s: ["squat", "hinge", "lunge", "legcurl", "calves", "core", "core"] },
};

// Split je Schwerpunkt und Anzahl Tage
export const SPLITS = {
  aus:   { 2: ["Ganzkörper A/B", "AB"], 3: ["Ganzkörper A/B/C", "ABC"], 4: ["Ober-/Unterkörper", "OUOU"], 5: ["Push/Pull/Beine + Ober/Unter", "PZLOU"], 6: ["Push/Pull/Beine ×2", "PZLPZL"] },
  ober:  { 2: ["Oberkörper + Ganzkörper", "OG"], 3: ["Ober/Unter/Ober", "OUO"], 4: ["Oberkörper-Schwerpunkt", "OUOG"], 5: ["Push/Pull/Beine + 2× Ober", "PZLOO"], 6: ["Push/Pull/Beine + Push/Pull/Ober", "PZLPZO"] },
  unter: { 2: ["Unterkörper + Ganzkörper", "UG"], 3: ["Unter/Ober/Unter", "UOU"], 4: ["Unterkörper-Schwerpunkt", "UOUG"], 5: ["Beine/Push/Pull + 2× Unter", "LPZUU"], 6: ["Beine/Push/Pull ×2", "LPZLPZ"] },
};

export const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
export const WEEKDAYS_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
export const SCHEDULE = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };

// Satz-/Wiederholungsschemata: [Sätze, Wdh., Pause s, RIR]
export const SCHEME = {
  fitness:  { main: [3, "8–10", 90, 2], acc: [3, "10–12", 60, 2], label: "Ausgewogen zwischen Kraft, Muskeln und Kondition, mit kurzem Finisher" },
  muskel:   { main: [4, "6–8", 120, 2], acc: [3, "10–12", 75, 1], label: "Moderates Gewicht, nah ans Muskelversagen" },
  kraft:    { main: [5, "3–5", 180, 2], acc: [3, "8–10", 90, 2], label: "Schwer und wenig Wiederholungen, lange Pausen" },
  abnehmen: { main: [3, "10–12", 60, 2], acc: [3, "12–15", 45, 2], label: "Kurze Pausen plus Finisher für hohen Kalorienverbrauch" },
  ausdauer: { main: [3, "12–15", 45, 3], acc: [2, "15–20", 30, 3], label: "Kraftausdauer plus eigene Cardio-Einheiten" },
};
export const SECONDS = { kraft: "30", muskel: "30–45", abnehmen: "30–45", ausdauer: "45–60", fitness: "30–45" };
export const WITH_FINISHER = ["fitness", "abnehmen", "ausdauer"];

export const WEEKS = [
  { n: "Einstieg", t: "Gewichte so wählen, dass noch 1 Wiederholung mehr als angegeben möglich wäre. Technik zuerst.", rir: 1, set: 0 },
  { n: "Aufbau", t: "Gleiche Sätze. Hast du letzte Woche alle Wiederholungen geschafft: 1–2 Wdh. mehr oder etwas mehr Gewicht.", rir: 0, set: 0 },
  { n: "Steigerung", t: "Ein zusätzlicher Satz bei den Hauptübungen. Die härteste Woche des Blocks.", rir: -1, set: 1 },
  { n: "Deload", t: "Ein Satz weniger und etwas leichter. Der Körper erholt sich und wird stärker.", rir: 2, set: -1 },
];
