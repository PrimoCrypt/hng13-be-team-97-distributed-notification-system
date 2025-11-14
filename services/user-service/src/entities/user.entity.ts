import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	CreateDateColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ unique: true })
	email: string;

	@Column()
	name: string;

	@Column({ name: 'password_hash' })
	password_hash: string;

	@Column({ name: 'push_token', nullable: true, type: 'text' })
	push_token: string | null;

	@Column('jsonb', { default: { email: true, push: true } })
	preferences: {
		email: boolean;
		push: boolean;
	};

	@CreateDateColumn({ name: 'created_at' })
	created_at: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updated_at: Date;
}

