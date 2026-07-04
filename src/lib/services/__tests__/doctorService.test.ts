import { describe, it, expect, vi, beforeEach } from "vitest";
import { DoctorService } from "@/lib/services/doctorService";
import { doctorsApi } from "@/api/v2/doctors";

vi.mock("@/api/v2/doctors", () => ({
  doctorsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("DoctorService.searchDoctors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca médicos via doctorsApi.list com o parâmetro search", async () => {
    const rows = [{ id: "1", name: "Dr Dudu" }];
    vi.mocked(doctorsApi.list).mockResolvedValue({ data: rows, total: 1 } as never);

    const result = await DoctorService.searchDoctors("dr dudu");

    expect(doctorsApi.list).toHaveBeenCalledWith({ search: "dr dudu", limit: 10 });
    expect(result).toEqual(rows);
  });

  it("retorna vazio sem chamar a API para termos com menos de 2 caracteres", async () => {
    const result = await DoctorService.searchDoctors("d");
    expect(result).toEqual([]);
    expect(doctorsApi.list).not.toHaveBeenCalled();
  });

  it("retorna vazio quando a API não devolve data", async () => {
    vi.mocked(doctorsApi.list).mockResolvedValue({ data: undefined, total: 0 } as never);
    const result = await DoctorService.searchDoctors("dr dudu");
    expect(result).toEqual([]);
  });
});
