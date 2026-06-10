import { env } from "../config/env.js";
import { hashPassword } from "../utils/password.js";
import { AppDataSource } from "./data-source.js";
import { Category } from "./entities/Category.js";
import { Organization } from "./entities/Organization.js";
import { User } from "./entities/User.js";

const initialCategories = ["Dúvida", "Problema/Incidente", "Solicitação"];
const legacyStatusCategories = ["Analisando", "Em desenvolvimento", "Em homologacao", "Liberado no site"];

export async function seedDatabase() {
  const categoryRepo = AppDataSource.getRepository(Category);
  for (const name of initialCategories) {
    const exists = await categoryRepo.findOne({ where: { name } });
    if (!exists) await categoryRepo.save(categoryRepo.create({ name, active: true }));
    else if (!exists.active) await categoryRepo.save({ ...exists, active: true });
  }

  for (const name of legacyStatusCategories) {
    const category = await categoryRepo.findOne({ where: { name } });
    if (category?.active) {
      category.active = false;
      await categoryRepo.save(category);
    }
  }

  const orgRepo = AppDataSource.getRepository(Organization);
  let hubly = await orgRepo.findOne({ where: { name: "Hubly" } });
  if (!hubly) {
    hubly = await orgRepo.save(orgRepo.create({ name: "Hubly" }));
  }

  const userRepo = AppDataSource.getRepository(User);
  const admin = await userRepo.findOne({ where: { email: env.admin.email } });
  if (!admin) {
    await userRepo.save(
      userRepo.create({
        name: env.admin.name,
        email: env.admin.email.toLowerCase(),
        passwordHash: hashPassword(env.admin.password),
        role: "admin",
        organization: hubly,
        organizationId: hubly.id
      })
    );
  }
}
