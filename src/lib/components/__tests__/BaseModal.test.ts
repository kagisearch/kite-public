import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { scrollLock } from '$lib/utils/scrollLock';
import BaseModal from '../BaseModal.svelte';

// Mock scrollLock
vi.mock('$lib/utils/scrollLock', () => ({
	scrollLock: {
		lock: vi.fn(),
		unlock: vi.fn(),
	},
}));

describe('BaseModal', () => {
	it('should render when isOpen is true', () => {
		const { getByRole } = render(BaseModal, {
			props: {
				isOpen: true,
				onClose: vi.fn(),
				title: 'Test Modal',
			},
		});

		const modal = getByRole('dialog');
		expect(modal).toBeInTheDocument();
		expect(modal).toHaveAttribute('aria-modal', 'true');
		expect(modal).toHaveAttribute('aria-label', 'Test Modal');
	});

	it('should not render when isOpen is false', () => {
		const { queryByRole } = render(BaseModal, {
			props: {
				isOpen: false,
				onClose: vi.fn(),
			},
		});

		expect(queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('should call onClose when backdrop is clicked', async () => {
		const onClose = vi.fn();
		const { container } = render(BaseModal, {
			props: {
				isOpen: true,
				onClose,
				closeOnBackdrop: true,
			},
		});

		const backdrop = container.querySelector('.fixed.inset-0');
		await fireEvent.click(backdrop!);

		expect(onClose).toHaveBeenCalled();
	});

	it('should not close on backdrop click when closeOnBackdrop is false', async () => {
		const onClose = vi.fn();
		const { container } = render(BaseModal, {
			props: {
				isOpen: true,
				onClose,
				closeOnBackdrop: false,
			},
		});

		const backdrop = container.querySelector('.fixed.inset-0');
		await fireEvent.click(backdrop!);

		expect(onClose).not.toHaveBeenCalled();
	});

	it('should call onClose when close button is clicked', async () => {
		const onClose = vi.fn();
		const { getByLabelText } = render(BaseModal, {
			props: {
				isOpen: true,
				onClose,
				showCloseButton: true,
				title: 'Test',
			},
		});

		const closeButton = getByLabelText('ui.close');
		await fireEvent.click(closeButton);

		expect(onClose).toHaveBeenCalled();
	});

	it('should lock scroll when opened', () => {
		render(BaseModal, {
			props: {
				isOpen: true,
				onClose: vi.fn(),
				lockScroll: true,
			},
		});

		expect(scrollLock.lock).toHaveBeenCalled();
	});

	it('should render content through children', async () => {
		const TestModalWithContent = await import('./TestModalWithContent.svelte');
		const { getByText, getByRole } = render(TestModalWithContent.default, {
			props: {
				isOpen: true,
				onClose: vi.fn(),
				title: 'Test Modal',
			},
		});

		expect(getByRole('dialog')).toBeInTheDocument();
		expect(getByText('Modal Content')).toBeInTheDocument();
	});

	it('should apply size classes correctly', () => {
		const { container } = render(BaseModal, {
			props: {
				isOpen: true,
				onClose: vi.fn(),
				size: 'lg',
			},
		});

		const modal = container.querySelector('[role="dialog"]');
		expect(modal).toHaveClass('max-w-4xl');
	});

	it('should apply position classes correctly', () => {
		const { container } = render(BaseModal, {
			props: {
				isOpen: true,
				onClose: vi.fn(),
				position: 'bottom',
			},
		});

		const backdrop = container.querySelector('.fixed.inset-0');
		expect(backdrop).toHaveClass('items-end');
	});

	it('should handle escape key when closeOnEscape is true', async () => {
		const onClose = vi.fn();
		render(BaseModal, {
			props: {
				isOpen: true,
				onClose,
				closeOnEscape: true,
			},
		});

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(onClose).toHaveBeenCalled();
	});

	it('should not handle escape key when closeOnEscape is false', async () => {
		const onClose = vi.fn();
		render(BaseModal, {
			props: {
				isOpen: true,
				onClose,
				closeOnEscape: false,
			},
		});

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(onClose).not.toHaveBeenCalled();
	});
});
