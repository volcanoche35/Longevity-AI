// Temalar — tek kaynak. UI bu listeyi kullanır; renkler globals.css'te [data-theme] bloklarında.
export interface ThemeDef { id: string; name: string; mode: 'dark' | 'light'; preview: string[] }
export const THEMES: ThemeDef[] = [
  { id: "indigo", name: "İndigo", mode: "dark", preview: ["#051230", "#0d1f45", "#2fc1b4", "#ebd3a2"] },
  { id: "zeytin", name: "Zeytin", mode: "dark", preview: ["#141b12", "#1e271c", "#fdbf68", "#f8b6ba"] },
  { id: "venedik", name: "Venedik", mode: "dark", preview: ["#0f1a17", "#182720", "#62c6bf", "#f8b6ba"] },
  { id: "okyanus", name: "Okyanus", mode: "dark", preview: ["#10161f", "#18202c", "#0093a5", "#d1b0a7"] },
  { id: "erik", name: "Erik", mode: "dark", preview: ["#160d12", "#20121b", "#f9c1ce", "#f3a257"] },
  { id: "narenciye", name: "Narenciye", mode: "dark", preview: ["#1a130c", "#251c12", "#f3a257", "#f8b6ba"] },
  { id: "kagit", name: "Kâğıt", mode: "light", preview: ["#f3efe3", "#fbf8f0", "#0f6f66", "#c4772a"] },
  { id: "kum", name: "Kum", mode: "light", preview: ["#f2ead8", "#fbf6ec", "#9a5c2c", "#c4772a"] },
  { id: "nane", name: "Nane", mode: "light", preview: ["#eaf3ec", "#f7fbf8", "#187a5c", "#c4772a"] },
  { id: "lavanta", name: "Lavanta", mode: "light", preview: ["#efeaf4", "#f8f5fb", "#6a4a9c", "#c4772a"] },
]
export const DEFAULT_THEME = "indigo"
