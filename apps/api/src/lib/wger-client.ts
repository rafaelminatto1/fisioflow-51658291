export interface WgerExercise {
  id: number;
  name: string;
  uuid: string;
  description: string;
  creation_date: string;
  category: {
    id: number;
    name: string;
  };
  muscles: {
    id: number;
    name: string;
    name_en: string;
    is_front: boolean;
    image_url_main: string;
    image_url_secondary: string;
  }[];
  muscles_secondary: {
    id: number;
    name: string;
    name_en: string;
    is_front: boolean;
    image_url_main: string;
    image_url_secondary: string;
  }[];
  equipment: {
    id: number;
    name: string;
  }[];
  language: {
    id: number;
    short_name: string;
    full_name: string;
  };
  aliases: string[];
  images: {
    id: number;
    uuid: string;
    exercise_base: number;
    image: string;
    is_main: boolean;
    style: string;
    license: number;
    license_title: string;
    license_object_url: string;
    license_author: string;
    license_author_url: string;
    license_derivative_source_url: string;
    author_history: string[];
  }[];
  videos: {
    id: number;
    uuid: string;
    exercise_base: number;
    video: string;
    is_main: boolean;
    size: number;
    duration: string;
    width: number;
    height: number;
    codec: string;
    codec_long: string;
    license: number;
    license_title: string;
    license_object_url: string;
    license_author: string;
    license_author_url: string;
    license_derivative_source_url: string;
    author_history: string[];
  }[];
}

interface WgerResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class WgerClient {
  private static readonly API_URL = "https://wger.de/api/v2";
  
  constructor(private token: string) {}

  async searchExercises(query: string, languageId: number = 5): Promise<WgerExercise[]> {
    // languageId 5 é pt (Portuguese) no wger, 2 é en.
    const url = `${WgerClient.API_URL}/exerciseinfo/?language=${languageId}&limit=10&term=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Token ${this.token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("Erro na API do wger:", await response.text());
      throw new Error(`wger API error: ${response.statusText}`);
    }

    const data = (await response.json()) as WgerResponse<WgerExercise>;
    return data.results;
  }

  async getExerciseById(id: number): Promise<WgerExercise> {
    const url = `${WgerClient.API_URL}/exerciseinfo/${id}/`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Token ${this.token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`wger API error: ${response.statusText}`);
    }

    return (await response.json()) as WgerExercise;
  }
}
