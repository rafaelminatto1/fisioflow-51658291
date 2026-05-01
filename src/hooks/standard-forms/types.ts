export interface FormField {
  rotulo: string;
  pergunta: string;
  tipo_campo: string;
  secao: string;
  ordem: number;
  obrigatorio: boolean;
  descricao?: string;
  minimo?: number;
  maximo?: number;
  opcoes?: string[];
}

export interface StandardForm {
  nome: string;
  tipo: string;
  descricao: string;
  campos: FormField[];
}

export interface StandardFormsMap {
  [key: string]: StandardForm;
}
