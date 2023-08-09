import { createSchema, createYoga } from 'graphql-yoga';
import gql from 'graphql-tag';
import { nanoid } from 'nanoid';

// Cloudflare Workers Runtime types
export interface Env {
	// Binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	Animal_Rescues_KV: KVNamespace;
}

// GraphQL Yoga Server
const yoga = createYoga<Env>({
	schema: createSchema({
		typeDefs: /* GraphQL */ gql`

			enum AnimalRescueSpecies {
				DOG
				CAT
			}
			type AnimalRescue {
				id: ID!
				name: String!
				species: AnimalRescueSpecies!
			}

			type Query {
				animalRescue(id: ID!): AnimalRescue
				animalRescues: [AnimalRescue]
			}

			type Mutation {
				addAnimalRescue(name: String!, species: AnimalRescueSpecies): AnimalRescue
			}
		`,
		resolvers: {
			Query: {
				animalRescue: async (_, { id }, { Animal_Rescues_KV }) => {
					const value = await Animal_Rescues_KV.get(id);
					console.log('value', value);
					return JSON.parse(value ?? 'null');
				},
				animalRescues: async (_, {}, { Animal_Rescues_KV }) => {
					const records = await Animal_Rescues_KV.list();

					const allRecords = await Promise.all(records.keys.map((k) => Animal_Rescues_KV.get(k.name)));
					const parsed = allRecords.map((r) => JSON.parse(r ?? 'null'));
					return parsed;
				},
			},
			Mutation: {
				addAnimalRescue: async (_, { name, species }, { Animal_Rescues_KV }) => {
					const newAnimalRescue = {
						name,
						species,
						id: nanoid(),
					};
					await Animal_Rescues_KV.put(newAnimalRescue.id, JSON.stringify(newAnimalRescue));
					return newAnimalRescue;
				},
			},
		},
	}),
});

// Fetch handler
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return yoga.fetch(request, env);
	},
};
